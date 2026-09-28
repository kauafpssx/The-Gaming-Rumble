use std::process::{Command, Stdio};

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

pub fn play_game(executable: &str) -> Result<(), String> {
    Command::new(executable).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn create_gaming_rumble_folder(drive: &str) -> Result<(), String> {
    let path = std::path::PathBuf::from(drive).join("Gaming Rumble");
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(())
}
