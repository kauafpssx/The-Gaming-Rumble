use std::path::PathBuf;
use std::process::Command;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

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

pub fn open_path(path: &str, select_file: &str, prefer_select: Option<bool>) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let prefer_select = prefer_select.unwrap_or(false);
        let select_target = PathBuf::from(select_file);
        let root_target = PathBuf::from(path);
        let mut cmd = Command::new("explorer");

        if prefer_select && select_target.is_file() {
            cmd.arg(format!("/select,{}", select_target.to_string_lossy()));
        } else if root_target.is_dir() {
            cmd.arg(root_target);
        } else if let Some(parent) = select_target.parent().filter(|parent| parent.is_dir()) {
            cmd.arg(parent);
        } else if let Some(existing_dir) = sanitize_existing_dir(path) {
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
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (path, select_file, prefer_select);
    }
    Ok(())
}

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
        let _ = default_path;
        Ok(None)
    }
}
