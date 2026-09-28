use std::io::{BufReader, Read};
use std::path::Path;
use std::process::{Command, Stdio};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use tauri::{AppHandle, Emitter};

const PASSWORD: &str = "online-fix.me";

fn parse_7z_percent(line: &str) -> Option<f64> {
    let trimmed = line.trim_start();
    let digits: String = trimmed.chars()
        .take_while(|ch| ch.is_ascii_digit())
        .collect();

    if digits.is_empty() {
        return None;
    }

    let remainder = &trimmed[digits.len()..];
    if !remainder.starts_with('%') {
        return None;
    }

    digits.parse::<f64>().ok()
}

#[allow(clippy::too_many_arguments)]
fn emit_extract_progress(
    app: &AppHandle,
    label: &str,
    file_name: &str,
    current: usize,
    total: usize,
    pct_start: f64,
    pct_end: f64,
    archive_pct: f64,
) {
    let clamped_pct = archive_pct.clamp(0.0, 100.0);
    let global_pct = pct_start + ((pct_end - pct_start) * (clamped_pct / 100.0));

    let _ = app.emit("extract-progress", serde_json::json!({
        "type": label,
        "file": file_name,
        "current": current,
        "total": total,
        "archive_pct": clamped_pct,
        "global_pct": global_pct
    }));
}

/// Runs system 7z with `-bsp1` progress reporting and streams percentages as events.
#[allow(clippy::too_many_arguments)]
pub async fn extract_with_7z_progress(
    sevenz: &Path,
    archive: &Path,
    out_dir: &Path,
    app: &AppHandle,
    pct_start: f64,
    pct_end: f64,
    current: usize,
    total: usize,
    label: &str,
    file_name: &str,
) -> Result<(), String> {
    let mut cmd = Command::new(sevenz);
    cmd.args(&[
        "x",
        &archive.to_string_lossy(),
        &format!("-o{}", out_dir.to_string_lossy()),
        &format!("-p{}", PASSWORD),
        "-y",
        "-bb1",
        "-bso1",
        "-bsp1",
    ]);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);

    let mut child = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let stderr_handle = child.stderr.take().map(|mut stderr| {
        std::thread::spawn(move || {
            let mut buf = String::new();
            let _ = stderr.read_to_string(&mut buf);
            buf
        })
    });

    if let Some(stdout) = child.stdout.take() {
        let mut reader = BufReader::new(stdout);
        let mut buffer = [0u8; 1024];
        let mut pending = String::new();
        let mut last_percent = 0.0f64;

        loop {
            let read = reader.read(&mut buffer).map_err(|e| e.to_string())?;
            if read == 0 {
                break;
            }

            pending.push_str(&String::from_utf8_lossy(&buffer[..read]));

            while let Some(split_idx) = pending.find(['\r', '\n']) {
                let line = pending[..split_idx].trim().to_string();
                let delimiter_len = pending[split_idx..]
                    .chars()
                    .take_while(|ch| *ch == '\r' || *ch == '\n')
                    .count();
                pending.drain(..split_idx + delimiter_len);

                if let Some(percent) = parse_7z_percent(&line) {
                    last_percent = percent;
                    emit_extract_progress(app, label, file_name, current, total, pct_start, pct_end, percent);
                }
            }
        }

        let trailing = pending.trim();
        if let Some(percent) = parse_7z_percent(trailing) {
            last_percent = percent;
        }

        if last_percent < 100.0 {
            emit_extract_progress(app, label, file_name, current, total, pct_start, pct_end, last_percent);
        }
    }

    let status = child.wait().map_err(|e| e.to_string())?;
    if !status.success() {
        let stderr_text = stderr_handle
            .and_then(|h| h.join().ok())
            .unwrap_or_default();
        let detail = stderr_text.trim();
        return Err(if detail.is_empty() {
            format!("7-Zip retornou codigo {}", status.code().unwrap_or(-1))
        } else {
            format!("7-Zip retornou codigo {}: {}", status.code().unwrap_or(-1), detail)
        });
    }

    Ok(())
}
