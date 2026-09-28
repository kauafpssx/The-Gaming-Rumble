use std::path::{Path, PathBuf};

use crate::commands::logger::{log_tag, LogLevel};

use super::merge::{merge_to_parent, move_all_to};

fn is_fix_artifact_name(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.contains("onlinefix")
        || lower == "steam_api64.dll"
        || lower == "steam_api.dll"
        || lower == "winmm.dll"
        || lower == "dlllist.txt"
        || lower == "launcher.exe"
}

pub fn should_preserve_same_name_child(parent: &Path, child: &Path) -> bool {
    let mut has_game_dir_markers = false;
    let mut has_legit_exe = false;

    let entries = match std::fs::read_dir(parent) {
        Ok(entries) => entries,
        Err(_) => return false,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path == child {
            continue;
        }

        let name = entry.file_name().to_string_lossy().to_lowercase();
        if path.is_dir() {
            if matches!(name.as_str(), "engine" | "_commonredist" | "content" | "binaries" | "plugins") {
                has_game_dir_markers = true;
            }
            continue;
        }

        if path.extension().and_then(|ext| ext.to_str()).map(|ext| ext.eq_ignore_ascii_case("exe")).unwrap_or(false)
            && !is_fix_artifact_name(&name)
        {
            has_legit_exe = true;
        }
    }

    has_game_dir_markers || has_legit_exe
}

pub fn promote_matching_nested_dir_to_root(root: &Path) -> usize {
    let root_name = match root.file_name().map(|name| name.to_string_lossy().to_lowercase()) {
        Some(name) => name,
        None => return 0,
    };

    let mut promoted = 0;
    let entries = match std::fs::read_dir(root) {
        Ok(entries) => entries,
        Err(_) => return 0,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let child_name = entry.file_name().to_string_lossy().to_lowercase();
        if child_name == root_name {
            if should_preserve_same_name_child(root, &path) {
                log_tag(LogLevel::DEBUG, "FLATTEN", format!("Preservando pasta legitima {:?} dentro de {:?}", path, root));
                continue;
            }
            log_tag(LogLevel::INFO, "FLATTEN", format!("Promovendo {:?} para {:?}", path, root));
            move_all_to(&path, root);
            promoted += 1;
        }
    }

    promoted
}

/// Walk down a chain of nested dirs where subdir name matches parent name.
pub fn find_deepest_same_name_dir(start: &Path) -> PathBuf {
    let mut current = start.to_path_buf();
    loop {
        let entries: Vec<_> = match std::fs::read_dir(&current) {
            Ok(e) => e.flat_map(|e| e).collect(),
            Err(_) => break,
        };
        let dirs: Vec<_> = entries.iter().filter(|e| e.path().is_dir()).collect();
        let current_name = match current.file_name() {
            Some(n) => n,
            None => break,
        };
        let same_name = dirs.iter().find(|e| e.file_name() == current_name);
        if let Some(entry) = same_name {
            if should_preserve_same_name_child(&current, &entry.path()) {
                break;
            }
            current = entry.path();
        } else if dirs.len() == 1 && !entries.iter().any(|e| e.path().is_file()) {
            current = dirs[0].path();
        } else {
            break;
        }
    }
    current
}

/// Top-down flatten: for each dir, if it has only 1 subdir with the SAME name
/// and no files at this level, merge the subdir up. Returns count flattened.
pub fn flatten_one_pass(root: &Path) -> usize {
    let mut count = 0;
    let mut to_visit = vec![root.to_path_buf()];
    while let Some(dir) = to_visit.pop() {
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                if entry.path().is_dir() {
                    to_visit.push(entry.path());
                }
            }
        }
    }
    to_visit.sort_by_key(|p| p.components().count());

    for dir in to_visit {
        let entries: Vec<_> = match std::fs::read_dir(&dir) {
            Ok(e) => e.flat_map(|e| e).collect(),
            Err(_) => continue,
        };
        let dirs: Vec<_> = entries.iter().filter(|e| e.path().is_dir()).collect();
        let has_files = entries.iter().any(|e| e.path().is_file());

        if dirs.len() == 1 && !has_files {
            let inner = dirs[0].path();
            let inner_name = inner.file_name();
            let dir_name = dir.file_name();
            let should_flatten = dir_name == inner_name
                || (dirs.len() == 1 && !has_files && !dir.as_os_str().is_empty());

            if should_flatten {
                log_tag(LogLevel::DEBUG, "FLATTEN", format!("{:?}", inner));
                merge_to_parent(&inner);
                count += 1;
            }
        }
    }
    count
}
