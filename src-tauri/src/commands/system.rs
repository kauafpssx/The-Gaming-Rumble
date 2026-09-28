use std::collections::HashMap;
use tauri::AppHandle;

use crate::services::library::update_executable_path;
use crate::services::system::{defender, fs_utils, process, shortcuts, tools};

pub use defender::DefenderStatus;
pub use tools::SystemStatus;

#[tauri::command]
pub fn check_is_admin() -> bool {
    process::check_is_admin()
}

#[tauri::command]
pub async fn create_gaming_rumble_folder(drive: String) -> Result<(), String> {
    process::create_gaming_rumble_folder(&drive)
}

#[tauri::command]
pub fn add_defender_exclusion(path: String) -> Result<(), String> {
    defender::add_defender_exclusion(&path)
}

#[tauri::command]
pub fn set_defender_realtime_monitoring(disabled: bool) -> Result<(), String> {
    defender::set_defender_realtime_monitoring(disabled)
}

#[tauri::command]
pub fn get_defender_status() -> DefenderStatus {
    defender::get_defender_status()
}

#[tauri::command]
pub fn play_game(executable: String) -> Result<(), String> {
    process::play_game(&executable)
}

#[tauri::command]
pub async fn get_system_status(app: AppHandle) -> Result<SystemStatus, String> {
    tools::get_system_status(app).await
}

#[tauri::command]
pub fn open_path(path: String, select_file: String, prefer_select: Option<bool>) -> Result<(), String> {
    fs_utils::open_path(&path, &select_file, prefer_select)
}

#[tauri::command]
pub async fn show_exe_picker(default_path: String) -> Result<Option<String>, String> {
    fs_utils::show_exe_picker(default_path).await
}

#[tauri::command]
pub fn update_executable(drive: String, title: String, executable: String) -> Result<(), String> {
    update_executable_path(&drive, &title, &executable)
}

#[tauri::command]
pub fn create_shortcut(title: String, executable: String, icon: Option<String>) -> Result<(), String> {
    shortcuts::create_shortcut(&title, &executable, icon.as_deref())
}

#[tauri::command]
pub fn remove_shortcut(title: String) -> Result<(), String> {
    shortcuts::remove_shortcut(&title)
}

#[tauri::command]
pub fn shortcut_exists(title: String) -> Result<bool, String> {
    shortcuts::shortcut_exists(&title)
}

#[tauri::command]
pub fn get_shortcut_states(titles: Vec<String>) -> Result<HashMap<String, bool>, String> {
    shortcuts::get_shortcut_states(titles)
}
