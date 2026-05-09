use std::{
    collections::{HashMap, HashSet},
    path::PathBuf,
    process::Command,
    sync::Mutex,
    time::{Duration, Instant},
};

use serde::Serialize;
use sysinfo::{ProcessesToUpdate, System};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, WindowEvent,
};

use super::library::{add_play_time, LibraryEntry};

const PLAYTIME_FLUSH_INTERVAL_MS: u64 = 10_000;
const PROCESS_WATCH_INTERVAL_SECS: u64 = 2;
const TRAY_SHOW_ID: &str = "tray_show";
const TRAY_QUIT_ID: &str = "tray_quit";

#[derive(Default)]
pub struct TrayState {
    pub quitting: Mutex<bool>,
}

#[derive(Default)]
pub struct GameMonitorState {
    sessions: Mutex<HashMap<String, ActiveGameSession>>,
}

struct ActiveGameSession {
    drive: String,
    title: String,
    executable: String,
    install_path: String,
    root_pid: u32,
    last_tick: Instant,
    pending_play_time_ms: u64,
    restore_window_on_exit: bool,
}

#[derive(Clone, Serialize)]
pub struct LibraryEntryUpdatedEvent {
    pub drive: String,
    pub entry: LibraryEntry,
}

fn session_key(drive: &str, title: &str) -> String {
    format!("{}::{}", drive.to_ascii_lowercase(), title.to_ascii_lowercase())
}

fn normalize_path(value: &str) -> String {
    value.replace('/', "\\").to_ascii_lowercase()
}

fn emit_visibility(app: &AppHandle, visible: bool) {
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

fn set_quitting(app: &AppHandle, quitting: bool) {
    if let Some(state) = app.try_state::<TrayState>() {
        if let Ok(mut value) = state.quitting.lock() {
            *value = quitting;
        }
    }
}

fn is_quitting(app: &AppHandle) -> bool {
    app.try_state::<TrayState>()
        .and_then(|state| state.quitting.lock().ok().map(|value| *value))
        .unwrap_or(false)
}

fn emit_library_update(app: &AppHandle, drive: String, entry: LibraryEntry) {
    let _ = app.emit(
        "library-entry-updated",
        LibraryEntryUpdatedEvent { drive, entry },
    );
}

fn flush_play_time(
    app: &AppHandle,
    drive: String,
    title: String,
    delta_ms: u64,
) -> Result<(), String> {
    if let Some(entry) = add_play_time(&drive, &title, delta_ms)? {
        emit_library_update(app, drive, entry);
    }
    Ok(())
}

fn session_is_running(system: &System, session: &ActiveGameSession) -> bool {
    let executable = normalize_path(&session.executable);
    let install_root = normalize_path(&session.install_path);
    let mut tracked_pids = HashSet::from([session.root_pid]);
    let mut changed = true;

    while changed {
        changed = false;
        for process in system.processes().values() {
            let Some(parent_pid) = process.parent() else {
                continue;
            };

            let parent_pid = parent_pid.as_u32();
            let process_pid = process.pid().as_u32();
            if tracked_pids.contains(&parent_pid) && tracked_pids.insert(process_pid) {
                changed = true;
            }
        }
    }

    for process in system.processes().values() {
        let process_pid = process.pid().as_u32();
        let process_path = process
            .exe()
            .map(|value| normalize_path(&value.to_string_lossy()))
            .unwrap_or_default();

        if !process_path.is_empty() && process_path == executable {
            return true;
        }

        if tracked_pids.contains(&process_pid)
            && !process_path.is_empty()
            && process_path.starts_with(&install_root)
        {
            return true;
        }
    }

    false
}

fn process_sessions(app: &AppHandle, system: &mut System) {
    let Some(state) = app.try_state::<GameMonitorState>() else {
        return;
    };

    system.refresh_processes(ProcessesToUpdate::All, true);
    let now = Instant::now();

    let mut flush_ops = Vec::<(String, String, u64)>::new();
    let mut close_ops = Vec::<(String, String, u64, bool)>::new();

    if let Ok(mut sessions) = state.sessions.lock() {
        for session in sessions.values_mut() {
            let delta_ms = now
                .saturating_duration_since(session.last_tick)
                .as_millis()
                .min(u128::from(u64::MAX)) as u64;
            session.last_tick = now;

            if session_is_running(system, session) {
                session.pending_play_time_ms = session.pending_play_time_ms.saturating_add(delta_ms);

                if session.pending_play_time_ms >= PLAYTIME_FLUSH_INTERVAL_MS {
                    flush_ops.push((
                        session.drive.clone(),
                        session.title.clone(),
                        session.pending_play_time_ms,
                    ));
                    session.pending_play_time_ms = 0;
                }
            } else {
                let pending_total = session.pending_play_time_ms.saturating_add(delta_ms);
                close_ops.push((
                    session.drive.clone(),
                    session.title.clone(),
                    pending_total,
                    session.restore_window_on_exit,
                ));
            }
        }

        for (drive, title, _, _) in &close_ops {
            sessions.remove(&session_key(drive, title));
        }
    }

    for (drive, title, delta_ms) in flush_ops {
        let _ = flush_play_time(app, drive, title, delta_ms);
    }

    for (drive, title, delta_ms, restore_window_on_exit) in close_ops {
        let _ = flush_play_time(app, drive, title, delta_ms);
        if restore_window_on_exit {
            show_main_window(app);
        }
    }
}

fn init_tray(app: &AppHandle) -> tauri::Result<()> {
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

#[tauri::command]
pub fn launch_and_track_game(
    app: AppHandle,
    state: State<'_, GameMonitorState>,
    drive: String,
    title: String,
    executable: String,
    install_path: String,
) -> Result<(), String> {
    if executable.trim().is_empty() {
        return Err("Executavel nao encontrado. O jogo pode nao ter sido extraido corretamente.".into());
    }

    let mut command = Command::new(&executable);
    if let Some(parent) = PathBuf::from(&executable).parent() {
        command.current_dir(parent);
    }

    let child = command.spawn().map_err(|e| e.to_string())?;
    let root_pid = child.id();

    if let Ok(mut sessions) = state.sessions.lock() {
        sessions.insert(
            session_key(&drive, &title),
            ActiveGameSession {
                drive,
                title,
                executable,
                install_path,
                root_pid,
                last_tick: Instant::now(),
                pending_play_time_ms: 0,
                restore_window_on_exit: true,
            },
        );
    }

    hide_main_window(&app);
    Ok(())
}
