use std::{
    collections::{HashMap, HashSet},
    path::PathBuf,
    process::Command,
    sync::Mutex,
    time::Instant,
};

use serde::Serialize;
use sysinfo::{ProcessesToUpdate, System};
use tauri::{AppHandle, Emitter, Manager, State};

use crate::services::library::{add_play_time, LibraryEntry};

use super::tray::{hide_main_window, show_main_window};

const PLAYTIME_FLUSH_INTERVAL_MS: u64 = 10_000;

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

pub fn process_sessions(app: &AppHandle, system: &mut System) {
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
