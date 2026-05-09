use std::path::PathBuf;
use std::process::{Command, Stdio};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use tauri::{AppHandle, Manager};
use std::collections::HashMap;
use super::library::update_executable_path;

fn sanitize_existing_dir(path: &str) -> Option<String> {
    let candidate = PathBuf::from(path);
    if candidate.is_dir() {
        return Some(candidate.to_string_lossy().into_owned());
    }

    candidate
        .parent()
        .filter(|parent| parent.is_dir())
        .map(|parent| parent.to_string_lossy().into_owned())
}

fn escape_ps_single_quoted(value: &str) -> String {
    value.replace('\'', "''")
}

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

#[derive(serde::Serialize)]
pub struct SystemStatus {
    #[serde(rename = "protocol")]
    pub protocol: String,
    #[serde(rename = "protocolActive")]
    pub protocol_active: bool,
    #[serde(rename = "aria2Version")]
    pub aria2_version: String,
    #[serde(rename = "sevenZipVersion")]
    pub seven_zip_version: String,
}

#[derive(serde::Serialize)]
pub struct DefenderStatus {
    pub available: bool,
}

fn parse_tool_version(binary: &std::path::Path, args: &[&str], expected_prefixes: &[&str], fallback_label: &str) -> String {
    let output = Command::new(binary)
        .args(args)
        .creation_flags(0x08000000)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();

    let Ok(output) = output else {
        return fallback_label.to_string();
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    for line in stdout.lines().chain(stderr.lines()) {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        if expected_prefixes.iter().any(|prefix| trimmed.to_ascii_lowercase().starts_with(&prefix.to_ascii_lowercase())) {
            return trimmed.to_string();
        }
    }

    fallback_label.to_string()
}

fn find_bundled_aria2c(app: &AppHandle) -> Option<PathBuf> {
    if let Ok(resources) = app.path().resolve("bin/aria2c.exe", tauri::path::BaseDirectory::Resource) {
        if resources.exists() {
            return Some(resources);
        }
    }

    let app_data = app.path().app_data_dir().ok()?;
    let aria2_path = app_data.join("bin").join("aria2c.exe");
    aria2_path.exists().then_some(aria2_path)
}

fn find_7zip(app: &AppHandle) -> Option<PathBuf> {
    for candidate in ["C:\\Program Files\\7-Zip\\7z.exe", "C:\\Program Files (x86)\\7-Zip\\7z.exe"] {
        let path = PathBuf::from(candidate);
        if path.exists() {
            return Some(path);
        }
    }

    if let Ok(resources) = app.path().resolve("7-ZIP/7z.exe", tauri::path::BaseDirectory::Resource) {
        if resources.exists() {
            return Some(resources);
        }
    }

    None
}

fn is_defender_available() -> bool {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-WindowStyle",
                "Hidden",
                "-Command",
                "$ErrorActionPreference='Stop'; try { Get-MpComputerStatus | Out-Null; Write-Output 'true' } catch { Write-Output 'false' }",
            ])
            .creation_flags(0x08000000)
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .output();

        let Ok(output) = output else {
            return false;
        };

        String::from_utf8_lossy(&output.stdout).trim().eq_ignore_ascii_case("true")
    }
    #[cfg(not(target_os = "windows"))]
    {
        false
    }
}

#[tauri::command]
pub fn check_is_admin() -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let output = Command::new("net")
            .arg("session")
            .creation_flags(0x08000000)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .output();
        output.map(|o| o.status.success()).unwrap_or(false)
    }
    #[cfg(not(target_os = "windows"))]
    true
}

#[tauri::command]
pub async fn create_gaming_rumble_folder(drive: String) -> Result<(), String> {
    let path = PathBuf::from(&drive).join("Gaming Rumble");
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn add_defender_exclusion(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let status = Command::new("powershell")
            .args(["-WindowStyle", "Hidden", "-Command", &format!("Add-MpPreference -ExclusionPath '{}' 2>$null", path)])
            .creation_flags(0x08000000)
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .map_err(|e| e.to_string())?;

        if !status.success() {
            return Ok(());
        }
    }
    Ok(())
}

#[tauri::command]
pub fn set_defender_realtime_monitoring(disabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        if !is_defender_available() {
            return Err("Windows Defender indisponivel neste sistema.".into());
        }

        let preference = if disabled { "$true" } else { "$false" };
        let status = Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-WindowStyle",
                "Hidden",
                "-Command",
                &format!("Set-MpPreference -DisableRealtimeMonitoring {} 2>$null", preference),
            ])
            .creation_flags(0x08000000)
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .map_err(|e| e.to_string())?;

        if !status.success() {
            return Err("Falha ao alterar o estado do Windows Defender.".into());
        }
    }

    Ok(())
}

#[tauri::command]
pub fn get_defender_status() -> DefenderStatus {
    DefenderStatus {
        available: is_defender_available(),
    }
}

#[tauri::command]
pub fn play_game(executable: String) -> Result<(), String> {
    std::process::Command::new(&executable)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_system_status(app: AppHandle) -> Result<SystemStatus, String> {
    let aria2_version = find_bundled_aria2c(&app)
        .map(|path| parse_tool_version(&path, &["--version"], &["aria2 version"], "ARIA2C indisponível"))
        .unwrap_or_else(|| "ARIA2C indisponível".to_string());

    let seven_zip_version = find_7zip(&app)
        .map(|path| parse_tool_version(&path, &[], &["7-zip"], "7-Zip indisponível"))
        .unwrap_or_else(|| "7-Zip indisponível".to_string());

    Ok(SystemStatus {
        protocol: "gaming-rumble://".to_string(),
        protocol_active: true,
        aria2_version,
        seven_zip_version,
    })
}

#[tauri::command]
pub fn open_path(path: String, select_file: String, prefer_select: Option<bool>) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let prefer_select = prefer_select.unwrap_or(false);
        let select_target = PathBuf::from(&select_file);
        let root_target = PathBuf::from(&path);
        let mut cmd = Command::new("explorer");

        if prefer_select && select_target.is_file() {
            cmd.arg(format!("/select,{}", select_target.to_string_lossy()));
        } else if root_target.is_dir() {
            cmd.arg(root_target);
        } else if let Some(parent) = select_target.parent().filter(|parent| parent.is_dir()) {
            cmd.arg(parent);
        } else if let Some(existing_dir) = sanitize_existing_dir(&path) {
            cmd.arg(existing_dir);
        } else {
            return Err("Falha ao abrir pasta: caminho invalido".into());
        }

        cmd.creation_flags(0x08000000)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| format!("Falha ao abrir pasta: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn show_exe_picker(default_path: String) -> Result<Option<String>, String> {
    #[cfg(target_os = "windows")]
    {
        let initial_dir = sanitize_existing_dir(&default_path).unwrap_or_else(|| "C:\\".to_string());
        tokio::task::spawn_blocking(move || {
            let ps_script = format!(
                r#"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.InitialDirectory = '{default_path}'
$dialog.Filter = "Executables (*.exe)|*.exe|All files (*.*)|*.*"
$dialog.Title = "Selecionar Executavel"
$dialog.RestoreDirectory = $true
$dialog.CheckFileExists = $true
$dialog.Multiselect = $false
$result = $dialog.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {{
    Write-Output $dialog.FileName
}} else {{
    Write-Output "CANCELLED"
}}
                "#,
                default_path = escape_ps_single_quoted(&initial_dir.replace('/', "\\"))
            );

            let mut cmd = Command::new("powershell");
            cmd.arg("-NoProfile")
                .arg("-STA")
                .arg("-Command")
                .arg(&ps_script)
                .creation_flags(0x08000000)
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::null());

            let output = cmd.output().map_err(|e| e.to_string())?;
            let result = String::from_utf8_lossy(&output.stdout).trim().to_string();

            if result == "CANCELLED" || result.is_empty() {
                return Ok(None);
            }

            Ok(Some(result.trim().trim_end_matches('\r').to_string()))
        })
        .await
        .map_err(|e| e.to_string())?
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(None)
    }
}

#[tauri::command]
pub fn update_executable(drive: String, title: String, executable: String) -> Result<(), String> {
    update_executable_path(&drive, &title, &executable)
}

#[tauri::command]
pub fn create_shortcut(title: String, executable: String, icon: Option<String>) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let shortcut_path = shortcut_path_for_title(&title)?;
        let safe_title = title.replace('\'', "''");
        let safe_exe = executable.replace('\'', "''");
        let icon_path = icon.as_deref().unwrap_or(&executable).replace('\'', "''");
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

#[tauri::command]
pub fn remove_shortcut(title: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let shortcut_path = shortcut_path_for_title(&title)?;
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

#[tauri::command]
pub fn shortcut_exists(title: String) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(shortcut_path_for_title(&title)?.exists())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = title;
        Ok(false)
    }
}

#[tauri::command]
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
