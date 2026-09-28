use std::path::PathBuf;
use std::process::{Command, Stdio};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use tauri::{AppHandle, Manager};

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

pub async fn get_system_status(app: AppHandle) -> Result<SystemStatus, String> {
    let aria2_version = "librqbit (motor nativo embutido)".to_string();

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
