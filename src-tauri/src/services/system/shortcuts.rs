use std::collections::HashMap;
use std::path::PathBuf;
use std::process::{Command, Stdio};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

fn shortcut_safe_name(title: &str) -> String {
    let invalid = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
    let cleaned: String = title
        .chars()
        .map(|ch| if invalid.contains(&ch) { '_' } else { ch })
        .collect();
    cleaned.trim().trim_end_matches('.').trim_end().to_string()
}

fn programs_shortcut_dir() -> Result<PathBuf, String> {
    let appdata = std::env::var("APPDATA")
        .map_err(|_| "Nao foi possivel localizar APPDATA para atalhos".to_string())?;
    let dir = PathBuf::from(appdata)
        .join("Microsoft")
        .join("Windows")
        .join("Start Menu")
        .join("Programs");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn shortcut_path_for_title(title: &str) -> Result<PathBuf, String> {
    let file_name = shortcut_safe_name(title);
    if file_name.is_empty() {
        return Err("Titulo invalido para criar atalho".into());
    }
    Ok(programs_shortcut_dir()?.join(format!("{}.lnk", file_name)))
}

pub fn create_shortcut(title: &str, executable: &str, icon: Option<&str>) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let shortcut_path = shortcut_path_for_title(title)?;
        let safe_title = title.replace('\'', "''");
        let safe_exe = executable.replace('\'', "''");
        let icon_path = icon.unwrap_or(executable).replace('\'', "''");
        let shortcut_dest = shortcut_path.to_string_lossy().replace('\'', "''");

        let ps_shortcut = format!(
            r#"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut('{shortcut_dest}')
$shortcut.TargetPath = '{safe_exe}'
$shortcut.WorkingDirectory = Split-Path '{safe_exe}'
$shortcut.IconLocation = '{icon_path}'
$shortcut.Description = '{safe_title}'
$shortcut.Save()
        "#,
            shortcut_dest = shortcut_dest,
            safe_title = safe_title,
            safe_exe = safe_exe,
            icon_path = icon_path
        );

        let result = Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", &ps_shortcut])
            .creation_flags(0x08000000)
            .stdout(Stdio::null())
            .stderr(Stdio::piped())
            .status()
            .map_err(|e| e.to_string())?;

        if !result.success() {
            return Err("Falha ao criar atalho no Menu Iniciar".into());
        }

        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = title;
        let _ = executable;
        let _ = icon;
        Ok(())
    }
}

pub fn remove_shortcut(title: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let shortcut_path = shortcut_path_for_title(title)?;
        if shortcut_path.exists() {
            std::fs::remove_file(shortcut_path).map_err(|e| e.to_string())?;
        }
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = title;
        Ok(())
    }
}

pub fn shortcut_exists(title: &str) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(shortcut_path_for_title(title)?.exists())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = title;
        Ok(false)
    }
}

pub fn get_shortcut_states(titles: Vec<String>) -> Result<HashMap<String, bool>, String> {
    #[cfg(target_os = "windows")]
    {
        let mut states = HashMap::new();
        for title in titles {
            let exists = shortcut_path_for_title(&title)
                .map(|path| path.exists())
                .unwrap_or(false);
            states.insert(title, exists);
        }
        Ok(states)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let mut states = HashMap::new();
        for title in titles {
            states.insert(title, false);
        }
        Ok(states)
    }
}
