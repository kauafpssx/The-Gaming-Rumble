use std::time::Duration;

use librqbit::{AddTorrent, AddTorrentOptions, AddTorrentResponse};
use tauri::{AppHandle, Emitter};

use crate::commands::logger::{log_tag, LogLevel};

use super::fix_select::{find_fix_file, normalize_fix_download};
use super::session::{session, Handle, ACTIVE_HANDLE};
use super::trackers::augment_magnet;

const PROGRESS_INTERVAL: Duration = Duration::from_millis(500);

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

/// Stops tracking whatever torrent is currently active (files are kept on disk,
/// so a later `start_torrent` on the same magnet resumes via a normal piece re-check).
pub async fn stop_torrent() -> Result<(), String> {
    let previous = ACTIVE_HANDLE.lock().await.take();
    if let Some(handle) = previous {
        if let Ok(sess) = session().await {
            let _ = sess.delete(handle.id().into(), false).await;
        }
    }
    Ok(())
}

fn emit_progress(app: &AppHandle, handle: &Handle) -> bool {
    let stats = handle.stats();
    let progress_percent = if stats.total_bytes > 0 {
        (stats.progress_bytes as f64 / stats.total_bytes as f64) * 100.0
    } else {
        0.0
    };
    // `stats.finished` alone can be reported a beat before every byte is actually
    // settled on disk (state transitions Live -> Paused right around completion).
    // Require the byte counters to agree too, so we never hand off to extraction
    // a fraction of a percent early.
    let truly_finished = stats.finished && stats.total_bytes > 0 && stats.progress_bytes >= stats.total_bytes;
    // This librqbit version doesn't split "live" peers into seeders vs leechers,
    // so seeds isn't tracked separately — peers already reflects the full swarm.
    let (speed_mbs, eta, peers) = match &stats.live {
        Some(live) => (
            live.download_speed.mbps,
            live.time_remaining.as_ref().map(|d| d.to_string()).unwrap_or_else(|| "--".into()),
            live.snapshot.peer_stats.live,
        ),
        None => (0.0, "--".into(), 0),
    };

    let _ = app.emit("download-progress", DownloadProgressPayload {
        progress_percent,
        speed_mbs,
        eta,
        peers,
        seeds: 0,
    });

    truly_finished
}

/// Polls a torrent's stats every `PROGRESS_INTERVAL` and emits "download-progress" until it
/// finishes, then emits "download-finished". Mirrors the aria2c stdout-log loop it replaces,
/// but reads structured stats straight from the in-process session instead of scraping text.
fn watch_progress(app: AppHandle, handle: Handle, fix_only: bool, install_path: String, fix_relative_path: Option<std::path::PathBuf>) {
    tokio::spawn(async move {
        let mut finished_passes = 0u8;

        loop {
            tokio::time::sleep(PROGRESS_INTERVAL).await;

            let still_active = ACTIVE_HANDLE.lock().await.as_ref().map(|h| h.id()) == Some(handle.id());
            if !still_active {
                return;
            }

            let finished = emit_progress(&app, &handle);
            if !finished {
                finished_passes = 0;
                continue;
            }

            // Require the "finished" signal to hold for two consecutive polls before
            // trusting it — same stability guard used by `wait_for_archives_to_settle`
            // for the on-disk file sizes, applied here to the engine's own state.
            finished_passes += 1;
            if finished_passes < 2 {
                continue;
            }

            log_tag(LogLevel::SUCCESS, "DOWNLOAD", "Torrent finalizado.");

            // librqbit keeps the downloaded files open (for seeding) until the torrent is
            // removed from the session — extraction would otherwise race against that open
            // handle and 7-Zip fails with "the process cannot access the file". Release it
            // here, before extraction is ever told to start.
            *ACTIVE_HANDLE.lock().await = None;
            if let Ok(sess) = session().await {
                let _ = sess.delete(handle.id().into(), false).await;
            }

            let selected_path = if fix_only {
                match fix_relative_path.as_deref() {
                    Some(relative) => match normalize_fix_download(std::path::Path::new(&install_path), relative) {
                        Ok(path) => Some(path.to_string_lossy().to_string()),
                        Err(e) => {
                            log_tag(LogLevel::ERROR, "DOWNLOAD", format!("Falha ao normalizar fix: {}", e));
                            None
                        }
                    },
                    None => None,
                }
            } else {
                None
            };

            let _ = app.emit("download-finished", DownloadFinishedPayload {
                success: true,
                fix_only,
                exit_code: None,
                selected_path,
            });
            return;
        }
    });
}

pub async fn start_torrent(app: AppHandle, magnet: String, install_path: String) -> Result<(), String> {
    stop_torrent().await?;

    let sess = session().await?;
    let augmented = augment_magnet(&magnet);

    log_tag(LogLevel::SUCCESS, "DOWNLOAD", "Transmissão iniciada.");

    let response = sess
        .add_torrent(
            AddTorrent::from_url(augmented),
            Some(AddTorrentOptions {
                output_folder: Some(install_path.clone()),
                overwrite: true,
                ..Default::default()
            }),
        )
        .await
        .map_err(|e| e.to_string())?;

    let handle = response.into_handle().ok_or("Falha ao iniciar o torrent")?;
    *ACTIVE_HANDLE.lock().await = Some(handle.clone());

    let _ = app.emit("download-progress", DownloadProgressPayload {
        progress_percent: 0.0,
        speed_mbs: 0.0,
        eta: "--".into(),
        peers: 0,
        seeds: 0,
    });

    watch_progress(app, handle, false, install_path, None);
    Ok(())
}

pub async fn start_fix_download(app: AppHandle, magnet: String, install_path: String) -> Result<(), String> {
    stop_torrent().await?;
    std::fs::create_dir_all(&install_path).map_err(|e| e.to_string())?;

    let sess = session().await?;
    let augmented = augment_magnet(&magnet);

    log_tag(LogLevel::INFO, "DOWNLOAD", "Buscando metadados do torrent...");

    let listing = sess
        .add_torrent(
            AddTorrent::from_url(augmented.clone()),
            Some(AddTorrentOptions { list_only: true, ..Default::default() }),
        )
        .await
        .map_err(|e| e.to_string())?;

    let AddTorrentResponse::ListOnly(listed) = listing else {
        return Err("Falha ao obter metadados do torrent.".into());
    };

    let (fix_index, fix_relative_path) = find_fix_file(&listed.info)?;
    log_tag(LogLevel::SUCCESS, "DOWNLOAD", format!("Fix encontrado: índice {}.", fix_index));

    let response = sess
        .add_torrent(
            AddTorrent::from_url(augmented),
            Some(AddTorrentOptions {
                output_folder: Some(install_path.clone()),
                overwrite: true,
                only_files: Some(vec![fix_index]),
                ..Default::default()
            }),
        )
        .await
        .map_err(|e| e.to_string())?;

    let handle = response.into_handle().ok_or("Falha ao iniciar o download do fix")?;
    *ACTIVE_HANDLE.lock().await = Some(handle.clone());

    watch_progress(app, handle, true, install_path, Some(fix_relative_path));
    Ok(())
}
