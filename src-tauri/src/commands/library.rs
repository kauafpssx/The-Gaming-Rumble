use crate::services::library::{self, LibraryEntry};

/// Auto-registers any `{drive}\Gaming Rumble\*` folder
/// that isn't tracked in the database yet.
#[tauri::command]
pub fn reconcile_library(drive: String) -> Result<Vec<LibraryEntry>, String> {
    library::reconcile_disk(&drive)
}

#[tauri::command]
pub fn add_to_library(drive: String, entry: LibraryEntry) -> Result<(), String> {
    library::add_to_library(&drive, entry)
}

#[tauri::command]
pub fn remove_from_library(drive: String, title: String) -> Result<(), String> {
    library::remove_from_library(&drive, &title)
}

#[tauri::command]
pub fn delete_all_games(drive: String) -> Result<(), String> {
    library::delete_all_games(&drive)
}
