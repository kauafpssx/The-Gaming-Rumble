use tauri::AppHandle;

use crate::services::archive::{self, InstallationMetadata};

#[tauri::command]
pub async fn extract_game(app: AppHandle, install_path: String) -> Result<(), String> {
    archive::extract_game(app, install_path).await
}

#[tauri::command]
pub async fn delete_folder(path: String) -> Result<(), String> {
    archive::delete_folder(path).await
}

#[tauri::command]
pub fn finalize_installation(install_path: String, title: Option<String>) -> Result<InstallationMetadata, String> {
    archive::finalize_installation(install_path, title)
}
