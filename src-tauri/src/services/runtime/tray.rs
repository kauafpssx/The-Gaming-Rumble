use std::sync::Mutex;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

const TRAY_SHOW_ID: &str = "tray_show";
const TRAY_QUIT_ID: &str = "tray_quit";

#[derive(Default)]
pub struct TrayState {
    pub quitting: Mutex<bool>,
}

pub fn emit_visibility(app: &AppHandle, visible: bool) {
    let _ = app.emit("app-visibility-changed", visible);
}

pub fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        let _ = window.set_always_on_top(true);
        let _ = window.set_always_on_top(false);
    }
    emit_visibility(app, true);
}

pub fn hide_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
    emit_visibility(app, false);
}

pub fn set_quitting(app: &AppHandle, quitting: bool) {
    if let Some(state) = app.try_state::<TrayState>() {
        if let Ok(mut value) = state.quitting.lock() {
            *value = quitting;
        }
    }
}

pub fn is_quitting(app: &AppHandle) -> bool {
    app.try_state::<TrayState>()
        .and_then(|state| state.quitting.lock().ok().map(|value| *value))
        .unwrap_or(false)
}

pub fn init_tray(app: &AppHandle) -> tauri::Result<()> {
    if app.tray_by_id("main-tray").is_some() {
        return Ok(());
    }

    let show_item = MenuItem::with_id(app, TRAY_SHOW_ID, "Abrir Launcher", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, TRAY_QUIT_ID, "Sair", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &separator, &quit_item])?;

    let mut tray_builder = TrayIconBuilder::with_id("main-tray")
        .menu(&menu)
        .tooltip("Gaming Rumble")
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            TRAY_SHOW_ID => show_main_window(app),
            TRAY_QUIT_ID => {
                set_quitting(app, true);
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick { button, .. } = event {
                if button == MouseButton::Left {
                    show_main_window(tray.app_handle());
                }
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        tray_builder = tray_builder.icon(icon);
    }

    tray_builder.build(app)?;
    Ok(())
}
