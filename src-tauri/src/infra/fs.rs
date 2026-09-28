use std::path::Path;

/// Recursively clears the read-only flag so a directory tree can be deleted or overwritten.
#[cfg(target_os = "windows")]
pub fn make_writable_recursive(path: &Path) {
    if path.is_dir() {
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                make_writable_recursive(&entry.path());
            }
        }
    }

    if let Ok(metadata) = std::fs::metadata(path) {
        let mut permissions = metadata.permissions();
        if permissions.readonly() {
            permissions.set_readonly(false);
            let _ = std::fs::set_permissions(path, permissions);
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn make_writable_recursive(_path: &Path) {}
