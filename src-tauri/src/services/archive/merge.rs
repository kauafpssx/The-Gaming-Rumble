use std::path::{Path, PathBuf};

pub fn merge_dirs(src: &Path, dst: &Path) {
    if let Ok(entries) = std::fs::read_dir(src) {
        for entry in entries.flatten() {
            let src_path = entry.path();
            let dst_path = dst.join(entry.file_name());
            if dst_path.exists() {
                if src_path.is_dir() && dst_path.is_dir() {
                    merge_dirs(&src_path, &dst_path);
                } else {
                    let _ = std::fs::remove_file(&dst_path);
                    let _ = std::fs::rename(&src_path, &dst_path);
                }
            } else {
                let _ = std::fs::rename(&src_path, &dst_path);
            }
        }
    }
    let _ = std::fs::remove_dir(src);
}

pub fn merge_to_parent(inner: &Path) {
    let parent = match inner.parent() {
        Some(p) => p, None => return,
    };
    if let Ok(entries) = std::fs::read_dir(inner) {
        for entry in entries.flatten() {
            let src = entry.path();
            let dst = parent.join(entry.file_name());
            if dst.exists() {
                if src.is_dir() && dst.is_dir() {
                    merge_dirs(&src, &dst);
                } else {
                    let _ = std::fs::remove_file(&dst);
                    let _ = std::fs::rename(&src, &dst);
                }
            } else {
                let _ = std::fs::rename(&src, &dst);
            }
        }
    }
    let _ = std::fs::remove_dir_all(inner);
}

/// Move all files and dirs from src into dest, overwriting files and merging dirs.
/// Then removes src.
pub fn move_all_to(src: &Path, dest: &Path) {
    if !src.is_dir() || !dest.is_dir() { return; }
    let mut deferred_moves: Vec<(PathBuf, PathBuf)> = Vec::new();

    if let Ok(entries) = std::fs::read_dir(src) {
        for entry in entries.flatten() {
            let src_path = entry.path();
            let dst_path = dest.join(entry.file_name());

            if dst_path == src {
                let temp_path = dest.join(format!(
                    ".__gr_promote_tmp__{}",
                    entry.file_name().to_string_lossy()
                ));
                let _ = std::fs::remove_dir_all(&temp_path);
                let _ = std::fs::remove_file(&temp_path);
                if std::fs::rename(&src_path, &temp_path).is_ok() {
                    deferred_moves.push((temp_path, dst_path));
                }
                continue;
            }

            if dst_path.exists() {
                if src_path.is_dir() && dst_path.is_dir() {
                    merge_dirs(&src_path, &dst_path);
                } else {
                    let _ = std::fs::remove_file(&dst_path);
                    let _ = std::fs::rename(&src_path, &dst_path);
                }
            } else {
                let _ = std::fs::rename(&src_path, &dst_path);
            }
        }
    }
    let _ = std::fs::remove_dir_all(src);

    for (temp_path, final_path) in deferred_moves {
        if final_path.exists() {
            if temp_path.is_dir() && final_path.is_dir() {
                merge_dirs(&temp_path, &final_path);
            } else {
                let _ = std::fs::remove_file(&final_path);
                let _ = std::fs::rename(&temp_path, &final_path);
            }
        } else {
            let _ = std::fs::rename(&temp_path, &final_path);
        }
    }
}
