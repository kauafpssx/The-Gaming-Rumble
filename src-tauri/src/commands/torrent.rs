use tauri::AppHandle;

use crate::services::{
    http_download::{self, HttpDownloadFile},
    torrent,
};

#[tauri::command]
pub async fn start_torrent(app: AppHandle, magnet: String, install_path: String) -> Result<(), String> {
    torrent::start_torrent(app, magnet, install_path).await
}

#[tauri::command]
pub async fn start_fix_download(app: AppHandle, magnet: String, install_path: String) -> Result<(), String> {
    torrent::start_fix_download(app, magnet, install_path).await
}

#[tauri::command]
pub async fn stop_torrent() -> Result<(), String> {
    torrent::stop_torrent().await
}

#[tauri::command]
pub async fn start_http_download(
    app: AppHandle,
    files: Vec<HttpDownloadFile>,
    install_path: String,
    fix_only: bool,
) -> Result<(), String> {
    http_download::start_http_download(app, files, install_path, fix_only).await
}

#[tauri::command]
pub async fn stop_http_download() -> Result<(), String> {
    http_download::stop_http_download().await
}
