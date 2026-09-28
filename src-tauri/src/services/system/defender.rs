use std::process::{Command, Stdio};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(serde::Serialize)]
pub struct DefenderStatus {
    pub available: bool,
}

pub fn is_defender_available() -> bool {
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

pub fn add_defender_exclusion(path: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
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
    #[cfg(not(target_os = "windows"))]
    {
        let _ = path;
    }
    Ok(())
}

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
    #[cfg(not(target_os = "windows"))]
    {
        let _ = disabled;
    }

    Ok(())
}

pub fn get_defender_status() -> DefenderStatus {
    DefenderStatus {
        available: is_defender_available(),
    }
}
