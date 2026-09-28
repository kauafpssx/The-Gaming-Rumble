use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

use crate::services::archive::finalize_installation;

use super::db::{normalize_drive, open_database};
use super::model::LibraryEntry;
use super::repository::{add_to_library, query_games};

fn gaming_rumble_dir(drive: &str) -> PathBuf {
    PathBuf::from(format!("{}\\Gaming Rumble", normalize_drive(drive)))
}

/// Scans `{drive}\Gaming Rumble\*` for installed-game folders that aren't tracked in the
/// database yet (e.g. left behind by a bug, or copied in manually) and registers them —
/// same detection logic used right after a normal download finishes extracting.
pub fn reconcile_disk(drive: &str) -> Result<Vec<LibraryEntry>, String> {
    let conn = open_database()?;
    let existing = query_games(&conn, drive)?;
    let known: HashSet<String> = existing.iter().map(|entry| entry.title.to_lowercase()).collect();
    let known_paths: HashSet<String> = existing.iter().map(|entry| entry.install_path.to_lowercase()).collect();

    let root = gaming_rumble_dir(drive);
    let entries = match fs::read_dir(&root) {
        Ok(entries) => entries,
        Err(_) => return query_games(&conn, drive),
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let title = entry.file_name().to_string_lossy().to_string();
        if known.contains(&title.to_lowercase()) || known_paths.contains(&path.to_string_lossy().to_lowercase()) {
            continue;
        }

        let install_path = path.to_string_lossy().to_string();
        let meta = match finalize_installation(install_path.clone(), Some(title.clone())) {
            Ok(meta) => meta,
            Err(_) => continue,
        };

        // No executable found — most likely a canceled/failed download's leftover folder
        // (e.g. a partial .rar with no game inside it), not a real installation. Leave it
        // alone instead of registering a library entry nobody can actually play.
        if meta.executable.is_empty() {
            continue;
        }

        let _ = add_to_library(
            drive,
            LibraryEntry {
                title,
                install_path,
                executable: meta.executable,
                banner: String::new(),
                size_gb: meta.size_gb,
                play_time_ms: 0,
            },
        );
    }

    query_games(&conn, drive)
}
