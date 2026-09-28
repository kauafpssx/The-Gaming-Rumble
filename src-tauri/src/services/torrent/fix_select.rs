use std::path::{Path, PathBuf};

use librqbit::ValidatedTorrentMetaV1Info;

/// Locates the "Fix.rar"-like file within a torrent's metadata and returns its
/// (0-based) file index plus its path relative to the torrent's output folder.
pub fn find_fix_file<Buf: AsRef<[u8]>>(info: &ValidatedTorrentMetaV1Info<Buf>) -> Result<(usize, PathBuf), String> {
    for (index, details) in info.iter_file_details().enumerate() {
        let segments = details.filename.to_vec();
        let joined = segments.join("/").to_lowercase();
        if joined.contains("fix") {
            let mut relative = PathBuf::new();
            for segment in segments {
                relative.push(segment);
            }
            return Ok((index, relative));
        }
    }
    Err("Fix.rar não encontrado nos metadados do torrent.".to_string())
}

fn find_file_by_name_recursive(root: &Path, target_name: &str) -> Option<PathBuf> {
    let entries = std::fs::read_dir(root).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if let Some(found) = find_file_by_name_recursive(&path, target_name) {
                return Some(found);
            }
        } else if path.file_name().and_then(|name| name.to_str()).map(|name| name.eq_ignore_ascii_case(target_name)).unwrap_or(false) {
            return Some(path);
        }
    }
    None
}

fn remove_unwanted_fix_artifacts(root: &Path, keep_name: &str) {
    if let Ok(entries) = std::fs::read_dir(root) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                remove_unwanted_fix_artifacts(&path, keep_name);
                let _ = std::fs::remove_dir(&path);
                continue;
            }

            let file_name = match path.file_name().and_then(|name| name.to_str()) {
                Some(name) => name,
                None => continue,
            };
            let lower = file_name.to_lowercase();
            let is_archive = lower.ends_with(".rar") || lower.ends_with(".zip") || lower.ends_with(".7z");
            let is_control = lower.ends_with(".parts") || lower.ends_with(".torrent");

            if is_control || (is_archive && !file_name.eq_ignore_ascii_case(keep_name)) {
                let _ = std::fs::remove_file(path);
            }
        }
    }
}

fn remove_empty_dirs_recursive(root: &Path) {
    if let Ok(entries) = std::fs::read_dir(root) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                remove_empty_dirs_recursive(&path);
                let _ = std::fs::remove_dir(&path);
            }
        }
    }
}

/// Moves the downloaded fix file to the root of `install_path` and cleans up
/// any leftover control files / other archives that came down alongside it.
pub fn normalize_fix_download(install_path: &Path, relative_path: &Path) -> Result<PathBuf, String> {
    let desired_name = relative_path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or("Nome do fix inválido")?
        .to_string();

    let expected_path = install_path.join(relative_path);
    let downloaded_fix = if expected_path.exists() {
        expected_path
    } else {
        find_file_by_name_recursive(install_path, &desired_name)
            .ok_or_else(|| "Fix baixado não encontrado no disco".to_string())?
    };

    let final_path = install_path.join(&desired_name);
    if downloaded_fix != final_path {
        if final_path.exists() {
            let _ = std::fs::remove_file(&final_path);
        }

        std::fs::rename(&downloaded_fix, &final_path)
            .or_else(|_| std::fs::copy(&downloaded_fix, &final_path).map(|_| ()))
            .map_err(|e| format!("Falha ao mover fix para a raiz: {}", e))?;

        let _ = std::fs::remove_file(&downloaded_fix);
    }

    remove_unwanted_fix_artifacts(install_path, &desired_name);
    remove_empty_dirs_recursive(install_path);

    Ok(final_path)
}
