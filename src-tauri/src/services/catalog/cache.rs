use std::path::PathBuf;

use crate::services::library::app_database_dir;

use super::model::CatalogSyncResult;

fn cache_path() -> Result<PathBuf, String> {
    Ok(app_database_dir()?.join("catalog-cache.json"))
}

pub fn read_cached_catalog() -> Result<Option<CatalogSyncResult>, String> {
    let path = cache_path()?;
    if !path.exists() {
        return Ok(None);
    }

    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut result: CatalogSyncResult = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    result.from_cache = true;
    Ok(Some(result))
}

pub fn write_cached_catalog(result: &CatalogSyncResult) -> Result<(), String> {
    let path = cache_path()?;
    let content = serde_json::to_string(result).map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| e.to_string())
}
