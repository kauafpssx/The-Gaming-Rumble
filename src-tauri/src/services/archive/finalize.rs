use std::path::Path;

use crate::commands::logger::{log_tag, LogLevel};

use super::cleanup::find_files_recursive;

#[derive(serde::Serialize)]
pub struct InstallationMetadata {
    pub size_gb: f64,
    pub executable: String,
}

/// Score how well an EXE filename matches keywords from the game title.
fn title_match_score(exe_stem: &str, title_words: &[&str]) -> i32 {
    let exe_lower = exe_stem.to_lowercase();
    let mut score = 0;
    for word in title_words {
        let w = word.to_lowercase();
        if w.len() < 3 { continue; }
        if exe_lower == w {
            score += 100;
        } else if exe_lower.contains(&w) {
            score += 50;
        } else if w.len() >= 5 && w.split_whitespace().next().map(|s| exe_lower.contains(&s.to_lowercase())).unwrap_or(false) {
            score += 25;
        }
    }
    score
}

fn dir_game_bonus(dir: &Path) -> i32 {
    let mut bonus = 0;
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let lower = entry.file_name().to_string_lossy().to_lowercase();
            if lower == "steam_api64.dll" || lower == "steam_api.dll" { bonus += 20; }
            if lower == "eos.dll" { bonus += 10; }
            if lower.ends_with("_data") || lower.contains("game") { bonus += 5; }
        }
    }
    bonus
}

fn get_folder_size(dir: &Path) -> u64 {
    let mut size = 0;
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                size += std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
            } else if path.is_dir() {
                size += get_folder_size(&path);
            }
        }
    }
    size
}

pub fn finalize_installation(install_path: &str, title: Option<String>) -> Result<InstallationMetadata, String> {
    let root = Path::new(install_path);
    if !root.exists() { return Err("Path not found".into()); }
    let size_bytes = get_folder_size(root);
    let size_gb = size_bytes as f64 / 1_073_741_824.0;

    let exes = find_files_recursive(root, "exe");
    let ignored = [
        "unins000", "crashreport", "crashhandler", "unitycrashhandler", "unityplayer",
        "dxsetup", "vcredist", "dotnet", "redist", "setup", "launcher", "prereq", "cefprocess",
        "shadercache", "mono", "unity"
    ];
    let skip_words = ["the", "of", "and", "or", "a", "an", "in", "on", "to", "vs",
                      "do", "da", "e", "em", "de", "para", "com", "por", "sem", "que", "na", "no", "nos", "das", "dos", "se", "seu", "sua", "ele", "ela"];
    let safe_title = title.unwrap_or_default()
        .replace('&', " ")
        .replace('-', " ")
        .replace(':', "");
    let title_words: Vec<&str> = safe_title.split_whitespace()
        .filter(|w| w.len() >= 3)
        .filter(|w| !skip_words.contains(&w.to_lowercase().as_str()))
        .collect();

    let mut best_exe = String::new();
    let mut best_score: i32 = i32::MIN;

    for exe in &exes {
        let name = exe.file_name().unwrap_or_default().to_string_lossy().to_lowercase();
        let stem = exe.file_stem().unwrap_or_default().to_string_lossy();
        if ignored.iter().any(|&i| name.contains(i)) { continue; }
        if let Ok(meta) = exe.metadata() {
            if meta.len() < 100_000 { continue; }
        }
        let depth = exe.components().count() as i32;
        let mut score = 100 - depth * 10;
        if !title_words.is_empty() {
            score += title_match_score(&stem, &title_words);
        }
        if let Some(parent) = exe.parent() {
            score += dir_game_bonus(parent);
        }
        if score > best_score {
            best_score = score;
            best_exe = exe.to_string_lossy().into_owned();
        }
    }

    if best_exe.is_empty() {
        log_tag(LogLevel::WARN, "EXE", "Nenhum executavel encontrado");
    } else {
        log_tag(LogLevel::SUCCESS, "EXE", format!("{} (score: {})", best_exe, best_score));
    }
    Ok(InstallationMetadata { size_gb, executable: best_exe })
}
