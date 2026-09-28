use rusqlite::{params, Connection, OptionalExtension};
use std::fs;
use std::path::PathBuf;

use crate::infra::fs::make_writable_recursive;

use super::db::{normalize_drive, open_database, read_u64, sqlite_u64};
use super::model::LibraryEntry;

pub fn query_games(conn: &Connection, drive: &str) -> Result<Vec<LibraryEntry>, String> {
    let normalized_drive = normalize_drive(drive);
    let mut stmt = conn
        .prepare(
            r#"
            SELECT title, install_path, executable, banner, size_gb, play_time_ms
            FROM games
            WHERE drive = ?1
            ORDER BY LOWER(title) ASC
            "#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([normalized_drive], |row| {
            Ok(LibraryEntry {
                title: row.get(0)?,
                install_path: row.get(1)?,
                executable: row.get(2)?,
                banner: row.get(3)?,
                size_gb: row.get(4)?,
                play_time_ms: read_u64(row.get::<_, i64>(5)?),
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn update_executable_path(drive: &str, title: &str, executable: &str) -> Result<(), String> {
    let conn = open_database()?;
    let normalized_drive = normalize_drive(drive);
    let rows = conn
        .execute(
            r#"
            UPDATE games
            SET executable = ?3, updated_at = CURRENT_TIMESTAMP
            WHERE drive = ?1 AND title = ?2
            "#,
            params![normalized_drive, title, executable],
        )
        .map_err(|e| e.to_string())?;

    if rows == 0 {
        return Err("Jogo nao encontrado na biblioteca".into());
    }
    Ok(())
}

pub fn add_play_time(drive: &str, title: &str, delta_ms: u64) -> Result<Option<LibraryEntry>, String> {
    if delta_ms == 0 {
        return Ok(None);
    }

    let conn = open_database()?;
    let normalized_drive = normalize_drive(drive);

    let rows = conn
        .execute(
            r#"
            UPDATE games
            SET play_time_ms = play_time_ms + ?3, updated_at = CURRENT_TIMESTAMP
            WHERE drive = ?1 AND title = ?2
            "#,
            params![normalized_drive.clone(), title, sqlite_u64(delta_ms)],
        )
        .map_err(|e| e.to_string())?;

    if rows == 0 {
        return Ok(None);
    }

    let entry = conn
        .query_row(
            r#"
            SELECT title, install_path, executable, banner, size_gb, play_time_ms
            FROM games
            WHERE drive = ?1 AND title = ?2
            "#,
            params![normalized_drive, title],
            |row| {
                Ok(LibraryEntry {
                    title: row.get(0)?,
                    install_path: row.get(1)?,
                    executable: row.get(2)?,
                    banner: row.get(3)?,
                    size_gb: row.get(4)?,
                    play_time_ms: read_u64(row.get::<_, i64>(5)?),
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;
    Ok(entry)
}

pub fn add_to_library(drive: &str, entry: LibraryEntry) -> Result<(), String> {
    let conn = open_database()?;
    let normalized_drive = normalize_drive(drive);

    conn.execute(
        r#"
        INSERT INTO games (drive, title, install_path, executable, banner, size_gb, play_time_ms, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP)
        ON CONFLICT(drive, title) DO UPDATE SET
            install_path = excluded.install_path,
            executable = excluded.executable,
            banner = excluded.banner,
            size_gb = excluded.size_gb,
            play_time_ms = CASE
                WHEN excluded.play_time_ms > 0 THEN excluded.play_time_ms
                ELSE games.play_time_ms
            END,
            updated_at = CURRENT_TIMESTAMP
        "#,
        params![
            normalized_drive,
            entry.title,
            entry.install_path,
            entry.executable,
            entry.banner,
            entry.size_gb,
            sqlite_u64(entry.play_time_ms)
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn remove_from_library(drive: &str, title: &str) -> Result<(), String> {
    let conn = open_database()?;
    let normalized_drive = normalize_drive(drive);

    conn.execute(
        "DELETE FROM games WHERE drive = ?1 AND title = ?2",
        params![normalized_drive, title],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_all_games(drive: &str) -> Result<(), String> {
    let conn = open_database()?;
    let games = query_games(&conn, drive)?;

    for game in &games {
        let install_path = PathBuf::from(&game.install_path);
        if install_path.exists() {
            make_writable_recursive(&install_path);
            let _ = fs::remove_dir_all(&install_path);
        }

        #[cfg(target_os = "windows")]
        {
            let programs_dir = std::env::var("APPDATA")
                .ok()
                .map(|appdata| {
                    PathBuf::from(appdata)
                        .join("Microsoft")
                        .join("Windows")
                        .join("Start Menu")
                        .join("Programs")
                });

            if let Some(programs_dir) = programs_dir {
                let shortcut = programs_dir.join(format!("{}.lnk", game.title));
                if shortcut.exists() {
                    let _ = fs::remove_file(shortcut);
                }
            }
        }
    }

    conn.execute(
        "DELETE FROM games WHERE drive = ?1",
        [normalize_drive(drive)],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
