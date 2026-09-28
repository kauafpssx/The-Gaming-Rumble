use std::io::{BufReader, Read};
use std::path::Path;
use std::process::{Command, Stdio};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use sevenz_rust::{decompress_file_with_password, Password};
use tauri::{AppHandle, Emitter};

use crate::commands::logger::{log_tag, LogLevel};

use super::seven_zip::ensure_7z;
use super::seven_zip_progress::extract_with_7z_progress;

const PASSWORD: &str = "online-fix.me";

/// Try system 7z first, fallback to sevenz-rust
async fn extract_rust_or_7z(app: &AppHandle, archive: &Path, out_dir: &str) -> Result<(), String> {
    if let Some(sevenz) = ensure_7z(app).await {
        log_tag(LogLevel::SUCCESS, "EXTRACT", format!("Usando 7-Zip para {}",
            archive.file_name().unwrap_or_default().to_string_lossy()));

        let output = Command::new(&sevenz)
            .args(&[
                "x",
                &archive.to_string_lossy(),
                &format!("-o{}", out_dir),
                &format!("-p{}", PASSWORD),
                "-y",
                "-bb1",
                "-bso1",
                "-bsp1",
            ])
            .creation_flags(0x08000000)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn();

        if let Ok(mut child) = output {
            let mut progress_output = String::new();
            if let Some(stdout) = child.stdout.take() {
                let mut reader = BufReader::new(stdout);
                let _ = reader.read_to_string(&mut progress_output);
            }
            let mut stderr_output = String::new();
            if let Some(stderr) = child.stderr.take() {
                let mut reader = BufReader::new(stderr);
                let _ = reader.read_to_string(&mut stderr_output);
            }

            let status = child.wait().map_err(|e| e.to_string())?;

            if status.success() {
                return Ok(());
            }

            log_tag(
                LogLevel::INFO,
                "EXTRACT",
                format!("7-Zip falhou (exit {}), tentando sevenz-rust", status.code().unwrap_or(-1))
            );
            if !progress_output.trim().is_empty() {
                log_tag(LogLevel::DEBUG, "EXTRACT", progress_output);
            }
            if !stderr_output.trim().is_empty() {
                log_tag(LogLevel::DEBUG, "EXTRACT", format!("stderr: {}", stderr_output.trim()));
            }
        }
    }

    decompress_file_with_password(archive, out_dir, Password::from(PASSWORD))
        .map_err(|e| format!("Falha ao extrair {} (erro: {})", archive.file_name().unwrap_or_default().to_string_lossy(), e))?;

    Ok(())
}

/// Extract archive using system 7z with sevenz-rust fallback, emitting progress events.
#[allow(clippy::too_many_arguments)]
pub async fn run_extract_with_progress(
    archive: &Path, out_dir: &Path,
    app: &AppHandle, pct_start: f64, pct_end: f64,
    current: usize, total: usize, label: &str, file_name: &str,
) -> Result<(), String> {
    let _ = app.emit("extract-progress", serde_json::json!({
        "type": label,
        "file": file_name,
        "current": current,
        "total": total,
        "global_pct": pct_start
    }));

    std::fs::create_dir_all(out_dir).map_err(|e| e.to_string())?;

    if let Some(sevenz) = ensure_7z(app).await {
        extract_with_7z_progress(
            &sevenz,
            archive,
            out_dir,
            app,
            pct_start,
            pct_end,
            current,
            total,
            label,
            file_name,
        ).await.map_err(|e| format!("Falha ao extrair {} (erro: {})", file_name, e))?;
    } else {
        extract_rust_or_7z(app, archive, &out_dir.to_string_lossy())
            .await
            .map_err(|e| format!("Falha ao extrair {} (erro: {})", file_name, e))?;
    }

    let _ = app.emit("extract-progress", serde_json::json!({
        "type": label,
        "file": file_name,
        "current": current,
        "total": total,
        "archive_pct": 100.0,
        "global_pct": pct_end
    }));

    Ok(())
}
