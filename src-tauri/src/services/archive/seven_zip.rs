use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

fn dbg(msg: &str) {
    eprintln!("[7z dbg] {}", msg);
}

static SEVENZ_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);

pub async fn ensure_7z(app: &AppHandle) -> Option<PathBuf> {
    dbg("ensure_7z called");
    let cached = SEVENZ_PATH.lock().unwrap().clone();
    if let Some(ref p) = cached {
        dbg(&format!("cached path: {:?}, exists: {}", p, p.exists()));
        if p.exists() { return cached; }
    }
    drop(cached);

    // 1. System installed
    for c in &["C:\\Program Files\\7-Zip\\7z.exe", "C:\\Program Files (x86)\\7-Zip\\7z.exe"] {
        let p = PathBuf::from(c);
        if p.exists() {
            dbg(&format!("found system 7z: {:?}", p));
            *SEVENZ_PATH.lock().unwrap() = Some(p.clone());
            return Some(p);
        }
    }

    // 2. Bundled with app resources
    if let Ok(res) = app.path().resolve("7-ZIP/7z.exe", tauri::path::BaseDirectory::Resource) {
        dbg(&format!("resolve path: {:?}", res));
        let sevenz_path: PathBuf = res;
        if sevenz_path.exists() {
            dbg(&format!("bundled 7z found: {:?}", sevenz_path));
            *SEVENZ_PATH.lock().unwrap() = Some(sevenz_path.clone());
            return Some(sevenz_path);
        }
    }

    dbg("7z not available");
    None
}
