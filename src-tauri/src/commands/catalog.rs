use crate::services::catalog::{self, CatalogSyncResult};

#[tauri::command]
pub fn get_cached_catalog() -> Result<Option<CatalogSyncResult>, String> {
    catalog::get_cached_catalog()
}

#[tauri::command]
pub async fn sync_catalog() -> Result<CatalogSyncResult, String> {
    catalog::sync_catalog().await
}
