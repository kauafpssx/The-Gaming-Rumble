use rusqlite::{params, Connection};
use std::fs;
use std::path::PathBuf;

use super::db::{legacy_import_marker_path, normalize_drive, open_database, sqlite_u64};
use super::model::LibraryConfig;

fn legacy_library_path(drive: &str) -> PathBuf {
    PathBuf::from(drive).join("Gaming Rumble").join("library.json")
}

fn read_legacy_games(drive: &str) -> Result<Vec<super::model::LibraryEntry>, String> {
    let path = legacy_library_path(drive);
    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let config: LibraryConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(config.games)
}

fn import_drive_legacy_json(conn: &Connection, drive: &str) -> Result<bool, String> {
    let legacy_games = read_legacy_games(drive)?;
    if legacy_games.is_empty() {
        return Ok(false);
    }

    let normalized_drive = normalize_drive(drive);
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    for game in legacy_games {
        tx.execute(
            r#"
            INSERT INTO games (drive, title, install_path, executable, banner, size_gb, play_time_ms, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP)
            ON CONFLICT(drive, title) DO UPDATE SET
                install_path = excluded.install_path,
                executable = excluded.executable,
                banner = excluded.banner,
                size_gb = excluded.size_gb,
                play_time_ms = CASE
                    WHEN games.play_time_ms > 0 THEN games.play_time_ms
                    ELSE excluded.play_time_ms
                END,
                updated_at = CURRENT_TIMESTAMP
            "#,
            params![
                normalized_drive,
                game.title,
                game.install_path,
                game.executable,
                game.banner,
                game.size_gb,
                sqlite_u64(game.play_time_ms)
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}

pub fn run_one_time_legacy_import() -> Result<(), String> {
    let marker = legacy_import_marker_path()?;
    if marker.exists() {
        return Ok(());
    }

    let conn = open_database()?;

    for letter in 'A'..='Z' {
        let drive = format!("{letter}:\\");
        let legacy_path = legacy_library_path(&drive);
        if !legacy_path.exists() {
            continue;
        }

        if import_drive_legacy_json(&conn, &drive)? {
            let _ = fs::remove_file(&legacy_path);
        }
    }

    fs::write(marker, b"done").map_err(|e| e.to_string())?;
    Ok(())
}
