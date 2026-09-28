use std::collections::HashMap;
use std::path::PathBuf;
use std::time::SystemTime;
use tauri::{AppHandle, Emitter};
use tokio::time::{sleep, Duration};

use crate::commands::logger::{log_tag, LogLevel};

fn archive_snapshot(archives: &[PathBuf]) -> Result<HashMap<String, (u64, Option<SystemTime>)>, String> {
    let mut snapshot = HashMap::new();

    for archive in archives {
        let meta = std::fs::metadata(archive)
            .map_err(|e| format!("Nao foi possivel ler metadata de {:?}: {}", archive, e))?;
        let modified = meta.modified().ok();
        snapshot.insert(
            archive.to_string_lossy().to_string(),
            (meta.len(), modified),
        );

        let partial = PathBuf::from(format!("{}.aria2", archive.to_string_lossy()));
        if partial.exists() {
            let partial_meta = std::fs::metadata(&partial)
                .map_err(|e| format!("Nao foi possivel ler metadata de {:?}: {}", partial, e))?;
            snapshot.insert(
                partial.to_string_lossy().to_string(),
                (partial_meta.len(), partial_meta.modified().ok()),
            );
        }
    }

    Ok(snapshot)
}

/// Waits until the given archives stop changing on disk (aria2 finished writing them).
pub async fn wait_for_archives_to_settle(archives: &[PathBuf], app: &AppHandle, label: &str) -> Result<(), String> {
    if archives.is_empty() {
        return Ok(());
    }

    let mut previous_snapshot: Option<HashMap<String, (u64, Option<SystemTime>)>> = None;
    let mut stable_passes = 0usize;

    for attempt in 1..=12usize {
        let snapshot = archive_snapshot(archives)?;
        let has_partial = snapshot.keys().any(|path| path.to_lowercase().ends_with(".aria2"));

        let same_as_before = previous_snapshot
            .as_ref()
            .map(|prev| prev == &snapshot)
            .unwrap_or(false);

        if !has_partial && same_as_before {
            stable_passes += 1;
            if stable_passes >= 2 {
                log_tag(LogLevel::DEBUG, "EXTRACT", format!("Arquivos de {} estabilizados no disco.", label));
                return Ok(());
            }
        } else {
            stable_passes = 0;
        }

        previous_snapshot = Some(snapshot);

        let _ = app.emit("extract-progress", serde_json::json!({
            "type": "preparing",
            "label": label,
            "attempt": attempt,
        }));
        sleep(Duration::from_millis(750)).await;
    }

    Err(format!("Os arquivos de {} nao estabilizaram a tempo para iniciar a extracao.", label))
}
