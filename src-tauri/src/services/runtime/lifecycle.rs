use std::time::Duration;

use sysinfo::System;
use tauri::{AppHandle, Manager, WindowEvent};

use super::game_monitor::process_sessions;
use super::tray::{emit_visibility, hide_main_window, init_tray, is_quitting};

const PROCESS_WATCH_INTERVAL_SECS: u64 = 2;

pub fn init_runtime(app: &AppHandle) -> tauri::Result<()> {
    init_tray(app)?;

    if let Some(window) = app.get_webview_window("main") {
        let app_handle = app.clone();
        window.on_window_event(move |event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if !is_quitting(&app_handle) {
                    api.prevent_close();
                    hide_main_window(&app_handle);
                }
            }
        });
    }

    emit_visibility(app, true);

    let watcher_app = app.clone();
    tauri::async_runtime::spawn(async move {
        let mut system = System::new_all();
        loop {
            process_sessions(&watcher_app, &mut system);
            tokio::time::sleep(Duration::from_secs(PROCESS_WATCH_INTERVAL_SECS)).await;
        }
    });

    Ok(())
}
