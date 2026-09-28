use std::io::{Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant};

use tauri::{AppHandle, Emitter};

use crate::commands::logger::{log_tag, LogLevel};

const PROGRESS_INTERVAL: Duration = Duration::from_millis(500);

/// Generation counter — bumping it invalidates whatever HTTP download is currently
/// running (the loop notices on its next chunk/progress tick and stops). Mirrors the
/// "swap out the active handle" pattern used by the torrent engine, without needing a
/// real handle: an HTTP download has nothing to hold onto between chunks.
static ACTIVE_DOWNLOAD_ID: AtomicU64 = AtomicU64::new(0);

/// The id of whichever download loop is *actually running right now* (0 = none). Bumping
/// `ACTIVE_DOWNLOAD_ID` only asks the loop to stop on its next check — this tracks when it
/// really has, file handle closed and all, so `stop_http_download` can wait for that before
/// returning. Without it, a `deleteFolder` fired right after cancel could race the file
/// still being open on Windows and silently fail, leaving a half-downloaded folder behind
/// for the next library scan to mistake for an install.
static RUNNING_DOWNLOAD_ID: AtomicU64 = AtomicU64::new(0);

struct RunningGuard;
impl Drop for RunningGuard {
    fn drop(&mut self) {
        RUNNING_DOWNLOAD_ID.store(0, Ordering::SeqCst);
    }
}

#[derive(serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HttpDownloadFile {
    pub url: String,
    pub file_name: String,
}

#[derive(serde::Serialize, Clone)]
struct DownloadFinishedPayload {
    success: bool,
    fix_only: bool,
    exit_code: Option<i32>,
    selected_path: Option<String>,
}

#[derive(serde::Serialize, Clone)]
struct DownloadProgressPayload {
    #[serde(rename = "progressPercent")]
    progress_percent: f64,
    #[serde(rename = "speedMBs")]
    speed_mbs: f64,
    eta: String,
    peers: u32,
    seeds: u32,
}

/// Stops tracking whatever HTTP download is currently active and waits (briefly) for its
/// file handle to actually close before returning, so a `deleteFolder` called right after
/// this is safe on Windows. The partial file itself is kept on disk so a later
/// `start_http_download` for the same URL resumes via HTTP Range.
pub async fn stop_http_download() -> Result<(), String> {
    let stopped_id = ACTIVE_DOWNLOAD_ID.fetch_add(1, Ordering::SeqCst);
    for _ in 0..100 {
        if RUNNING_DOWNLOAD_ID.load(Ordering::SeqCst) != stopped_id {
            break;
        }
        tokio::time::sleep(Duration::from_millis(20)).await;
    }
    Ok(())
}

fn format_eta(seconds: f64) -> String {
    if !seconds.is_finite() || seconds <= 0.0 {
        return "--".into();
    }
    let total = seconds as u64;
    format!("{:02}:{:02}:{:02}", total / 3600, (total % 3600) / 60, total % 60)
}

/// Downloads one or more files sequentially into `{install_path}/{file_name}` over plain
/// HTTP, resuming via `Range` if a partial file is already there (same "kept on cancel"
/// behavior as the torrent engine). A full Pixeldrain install passes both the game and
/// fix archives here so they land side by side before extraction runs, exactly like a
/// multi-file torrent would; a fix-only download passes just the one file. Emits the same
/// `download-progress` / `download-finished` events the torrent engine does, so the
/// existing extraction pipeline needs no changes to consume either source.
pub async fn start_http_download(
    app: AppHandle,
    files: Vec<HttpDownloadFile>,
    install_path: String,
    fix_only: bool,
) -> Result<(), String> {
    let my_id = ACTIVE_DOWNLOAD_ID.fetch_add(1, Ordering::SeqCst) + 1;
    RUNNING_DOWNLOAD_ID.store(my_id, Ordering::SeqCst);
    let _running_guard = RunningGuard;

    std::fs::create_dir_all(&install_path).map_err(|e| e.to_string())?;

    let client = reqwest::Client::new();
    let mut downloaded_before: u64 = 0;
    let mut last_dest = PathBuf::new();

    for (idx, file) in files.iter().enumerate() {
        let dest = Path::new(&install_path).join(&file.file_name);
        last_dest = dest.clone();

        let already_downloaded = std::fs::metadata(&dest).map(|m| m.len()).unwrap_or(0);

        log_tag(
            LogLevel::SUCCESS,
            "DOWNLOAD",
            format!("Baixando via HTTP ({}/{}): {}", idx + 1, files.len(), file.file_name),
        );

        let mut request = client.get(&file.url);
        if already_downloaded > 0 {
            request = request.header("Range", format!("bytes={}-", already_downloaded));
        }

        let mut response = request.send().await.map_err(|e| e.to_string())?;

        // The file on disk already covers everything the server has — nothing left to
        // fetch for it (e.g. resuming after this file finished but a later one didn't).
        if response.status().as_u16() == 416 {
            log_tag(LogLevel::INFO, "DOWNLOAD", format!("Arquivo ja completo: {}", file.file_name));
            downloaded_before += already_downloaded;
            continue;
        }

        if !response.status().is_success() {
            return Err(format!("Servidor retornou status {}", response.status().as_u16()));
        }

        let resumed = response.status().as_u16() == 206;
        let range_total = response
            .headers()
            .get("content-range")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.rsplit('/').next())
            .and_then(|v| v.parse::<u64>().ok());
        let content_length = response.content_length().unwrap_or(0);
        let file_total = range_total.unwrap_or(if resumed { already_downloaded + content_length } else { content_length });

        let mut out = std::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .open(&dest)
            .map_err(|e| e.to_string())?;
        let start_offset = if resumed { already_downloaded } else { 0 };
        out.seek(SeekFrom::Start(start_offset)).map_err(|e| e.to_string())?;
        if !resumed {
            out.set_len(0).map_err(|e| e.to_string())?;
        }

        let mut downloaded = start_offset;
        let started_at = Instant::now();
        let mut last_emit = Instant::now();
        let mut last_emit_bytes = downloaded;
        // Total across the whole session so far — bytes already settled from earlier
        // files plus this file's own total. Recomputed fresh per file (never a stale
        // upfront guess), so a two-file download can never overshoot 100% once the
        // second file starts, no matter what the first file's real size turned out to be.
        let global_total = downloaded_before + file_total;

        let _ = app.emit("download-progress", DownloadProgressPayload {
            progress_percent: if global_total > 0 { (downloaded_before + downloaded) as f64 / global_total as f64 * 100.0 } else { 0.0 },
            speed_mbs: 0.0,
            eta: "--".into(),
            peers: 0,
            seeds: 0,
        });

        loop {
            if ACTIVE_DOWNLOAD_ID.load(Ordering::SeqCst) != my_id {
                log_tag(LogLevel::INFO, "DOWNLOAD", "Download HTTP interrompido.");
                return Ok(());
            }

            let chunk = match response.chunk().await {
                Ok(Some(c)) => c,
                Ok(None) => break,
                Err(e) => return Err(e.to_string()),
            };

            out.write_all(&chunk).map_err(|e| e.to_string())?;
            downloaded += chunk.len() as u64;

            if last_emit.elapsed() >= PROGRESS_INTERVAL {
                let elapsed = last_emit.elapsed().as_secs_f64().max(0.001);
                let speed_bps = (downloaded - last_emit_bytes) as f64 / elapsed;
                let speed_mbs = speed_bps / 1_000_000.0;
                let global_downloaded = downloaded_before + downloaded;
                let remaining = global_total.saturating_sub(global_downloaded);
                let eta = format_eta(if speed_bps > 0.0 { remaining as f64 / speed_bps } else { f64::INFINITY });

                let _ = app.emit("download-progress", DownloadProgressPayload {
                    progress_percent: if global_total > 0 { global_downloaded as f64 / global_total as f64 * 100.0 } else { 0.0 },
                    speed_mbs,
                    eta,
                    peers: 0,
                    seeds: 0,
                });

                last_emit = Instant::now();
                last_emit_bytes = downloaded;
            }
        }

        out.flush().map_err(|e| e.to_string())?;
        drop(out);

        if file_total > 0 && downloaded < file_total {
            return Err(format!("Download incompleto: {} de {} bytes ({})", downloaded, file_total, file.file_name));
        }

        log_tag(
            LogLevel::SUCCESS,
            "DOWNLOAD",
            format!("Concluido em {:.0}s: {}", started_at.elapsed().as_secs_f64(), file.file_name),
        );
        downloaded_before += downloaded;
    }

    let _ = app.emit("download-progress", DownloadProgressPayload {
        progress_percent: 100.0,
        speed_mbs: 0.0,
        eta: "--".into(),
        peers: 0,
        seeds: 0,
    });

    log_tag(LogLevel::SUCCESS, "DOWNLOAD", "Download HTTP concluido.");

    let _ = app.emit("download-finished", DownloadFinishedPayload {
        success: true,
        fix_only,
        exit_code: None,
        selected_path: if fix_only { last_dest.to_str().map(|s| s.to_string()) } else { None },
    });

    Ok(())
}
