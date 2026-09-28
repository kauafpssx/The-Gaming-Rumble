use tauri::{AppHandle, State};

use crate::services::runtime;

pub use runtime::{init_runtime, show_main_window, GameMonitorState, TrayState};

#[tauri::command]
pub fn launch_and_track_game(
    app: AppHandle,
    state: State<'_, runtime::GameMonitorState>,
    drive: String,
    title: String,
    executable: String,
    install_path: String,
) -> Result<(), String> {
    runtime::launch_and_track_game(app, state, drive, title, executable, install_path)
}
