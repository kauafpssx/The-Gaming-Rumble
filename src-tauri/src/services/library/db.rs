use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;

pub fn app_database_dir() -> Result<PathBuf, String> {
    let base = dirs::data_local_dir()
        .or_else(dirs::data_dir)
        .ok_or_else(|| "Nao foi possivel localizar a pasta de dados local do app".to_string())?;
    let dir = base.join("GamingRumble");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

pub fn legacy_import_marker_path() -> Result<PathBuf, String> {
    Ok(app_database_dir()?.join("legacy-library-import.done"))
}

pub fn database_path() -> Result<PathBuf, String> {
    Ok(app_database_dir()?.join("library.db"))
}

pub fn open_database() -> Result<Connection, String> {
    let path = database_path()?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            drive TEXT NOT NULL,
            title TEXT NOT NULL,
            install_path TEXT NOT NULL,
            executable TEXT NOT NULL,
            banner TEXT NOT NULL,
            size_gb REAL NOT NULL DEFAULT 0,
            play_time_ms INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(drive, title)
        );
        CREATE INDEX IF NOT EXISTS idx_games_drive_title ON games(drive, title);
        "#,
    )
    .map_err(|e| e.to_string())?;
    Ok(conn)
}

pub fn normalize_drive(drive: &str) -> String {
    drive.trim().trim_end_matches('\\').to_ascii_uppercase()
}

pub fn sqlite_u64(value: u64) -> i64 {
    value.min(i64::MAX as u64) as i64
}

pub fn read_u64(value: i64) -> u64 {
    value.max(0) as u64
}
