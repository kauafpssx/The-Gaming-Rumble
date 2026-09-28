use std::path::{Path, PathBuf};

pub fn find_files_recursive(dir: &Path, ext: &str) -> Vec<PathBuf> {
    let mut result = Vec::new();
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                result.extend(find_files_recursive(&path, ext));
            } else if path.extension().and_then(|e| e.to_str()) == Some(ext) {
                result.push(path);
            }
        }
    }
    result
}

pub fn clean_archives(dir: &Path) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() { clean_archives(&path); }
            else {
                let ext = path.extension().and_then(|e| e.to_str()).unwrap_or_default().to_lowercase();
                if ext == "rar" || ext == "zip" || ext == "7z"
                    || ext.starts_with("r0") || ext.starts_with("r1") || ext.starts_with("r2")
                    || ext.starts_with("r3") || ext.starts_with("r4") || ext.starts_with("r5")
                    || ext.starts_with("r6") || ext.starts_with("r7") || ext.starts_with("r8")
                    || ext.starts_with("r9")
                { let _ = std::fs::remove_file(&path); }
            }
        }
    }
}

pub fn remove_empty_dirs(dir: &Path) {
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                remove_empty_dirs(&path);
                let _ = std::fs::remove_dir(&path);
            }
        }
    }
}
