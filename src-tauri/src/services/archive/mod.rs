mod cleanup;
mod extraction;
mod finalize;
mod flatten;
mod merge;
mod settle;
mod seven_zip;
mod seven_zip_progress;
mod sorting;

use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};

use crate::commands::logger::{log_tag, LogLevel};
use crate::infra::fs::make_writable_recursive;

pub use finalize::InstallationMetadata;

pub async fn extract_game(app: AppHandle, install_path: String) -> Result<(), String> {
    log_tag(LogLevel::SUCCESS, "EXTRACT", format!("Iniciando extracao em {}", install_path));
    let root = Path::new(&install_path);

    // 1. Find archives
    let rars = cleanup::find_files_recursive(root, "rar");
    let zips = cleanup::find_files_recursive(root, "zip");
    let all_archives: Vec<PathBuf> = rars.into_iter().chain(zips).collect();
    if all_archives.is_empty() {
        return Err("Nenhum arquivo encontrado no diretorio de download".into());
    }

    // 2. Separate game from fix
    let mut game_archives: Vec<PathBuf> = Vec::new();
    let mut fix_archives: Vec<PathBuf> = Vec::new();
    for archive in &all_archives {
        let lower = archive.to_string_lossy().to_lowercase();
        if lower.contains("fix") || lower.contains("repair") {
            fix_archives.push(archive.clone());
        } else {
            game_archives.push(archive.clone());
        }
    }
    game_archives.sort_by(sorting::compare_archives);
    fix_archives.sort_by(sorting::compare_archives);
    game_archives = sorting::dedupe_extract_roots(game_archives);
    fix_archives = sorting::dedupe_extract_roots(fix_archives);

    settle::wait_for_archives_to_settle(&game_archives, &app, "jogo").await?;
    settle::wait_for_archives_to_settle(&fix_archives, &app, "fix").await?;

    let total_jobs = game_archives.len() + fix_archives.len();
    log_tag(LogLevel::INFO, "EXTRACT", format!("{} arquivo(s) de jogo e {} fix", game_archives.len(), fix_archives.len()));

    // 3. Extract game archives
    let game_extract_dir = root;

    for (i, archive) in game_archives.iter().enumerate() {
        let pct_start = (i as f64 / total_jobs as f64) * 100.0;
        let pct_end = ((i + 1) as f64 / total_jobs as f64) * 100.0;
        let file_name = archive.file_name().unwrap_or_default().to_string_lossy().to_string();
        log_tag(LogLevel::INFO, "EXTRACT", format!("[{}/{}] Jogo: {}", i + 1, total_jobs, file_name));
        extraction::run_extract_with_progress(archive, game_extract_dir, &app,
            pct_start, pct_end, i + 1, total_jobs, "extracting", &file_name).await?;
    }

    // 4. Save fix archive to temp (preserve while we delete Fix Repair dir)
    let fix_tmp_dir = std::env::temp_dir().join("gr_extract_tmp");
    std::fs::create_dir_all(&fix_tmp_dir).map_err(|e| e.to_string())?;
    let mut fix_tmp_paths: Vec<PathBuf> = Vec::new();

    for (i, fix_archive) in fix_archives.iter().enumerate() {
        let dest = fix_tmp_dir.join(format!("fix_{}.rar", i));
        std::fs::copy(fix_archive, &dest)
            .map_err(|e| format!("Nao foi possivel copiar o fix: {}", e))?;
        log_tag(LogLevel::DEBUG, "EXTRACT", format!("Fix copiado para temp: {:?}", dest));
        fix_tmp_paths.push(dest);
    }

    // Delete Fix Repair dir
    if let Ok(entries) = std::fs::read_dir(game_extract_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                let name = entry.file_name().to_string_lossy().to_lowercase();
                if name.contains("fix") || name.contains("repair") {
                    cleanup::remove_empty_dirs(&p);
                    let _ = std::fs::remove_dir(&p);
                    let _ = std::fs::remove_dir_all(&p);
                }
            }
        }
    }

    // 5. Flatten duplicate nested dirs
    log_tag(LogLevel::INFO, "EXTRACT", "Aplicando flattening...");
    while flatten::flatten_one_pass(root) > 0 {}
    while flatten::promote_matching_nested_dir_to_root(root) > 0 {}

    // 6. Find where the game ended up
    let game_dir = flatten::find_deepest_same_name_dir(root);
    log_tag(LogLevel::INFO, "EXTRACT", format!("Pasta do jogo: {:?}", game_dir));

    // 7. Extract fix to game directory
    for (i, fix_tmp_path) in fix_tmp_paths.iter().enumerate() {
        let idx = game_archives.len() + i;
        let pct_start = (idx as f64 / total_jobs as f64) * 100.0;
        let pct_end = ((idx + 1) as f64 / total_jobs as f64) * 100.0;
        let file_name = format!("fix_{}.rar", i);
        log_tag(LogLevel::INFO, "EXTRACT", format!("[{}/{}] Fix: {:?}", idx + 1, total_jobs, fix_tmp_path));
        extraction::run_extract_with_progress(fix_tmp_path, &game_dir, &app,
            pct_start, pct_end, idx + 1, total_jobs, "extracting_fix", &file_name).await?;
    }

    // 8. Move everything from deepest nested dir to root
    let deepest = flatten::find_deepest_same_name_dir(root);
    if deepest != root && deepest.exists() {
        log_tag(LogLevel::INFO, "EXTRACT", format!("Movendo conteudo de {:?} para raiz", deepest));
        merge::move_all_to(&deepest, root);
        while flatten::flatten_one_pass(root) > 0 {}
        while flatten::promote_matching_nested_dir_to_root(root) > 0 {}
    }

    // 9. Remove temp dir
    if fix_tmp_dir.exists() {
        let _ = std::fs::remove_dir_all(&fix_tmp_dir);
    }

    // 10. Clean
    log_tag(LogLevel::INFO, "EXTRACT", "Limpando arquivos e pastas...");
    let _ = app.emit("extract-progress", serde_json::json!({"type": "cleaning"}));
    cleanup::clean_archives(root);
    cleanup::remove_empty_dirs(root);
    while flatten::flatten_one_pass(root) > 0 {}
    while flatten::promote_matching_nested_dir_to_root(root) > 0 {}

    log_tag(LogLevel::SUCCESS, "EXTRACT", "Extracao completa!");
    let _ = app.emit("extract-progress", serde_json::json!({"type": "done"}));
    Ok(())
}

pub async fn delete_folder(path: String) -> Result<(), String> {
    log_tag(LogLevel::INFO, "DELETE", format!("Deletando pasta: {}", path));
    let delete_path = path.clone();
    tokio::task::spawn_blocking(move || {
        let p = PathBuf::from(&delete_path);
        if p.exists() {
            make_writable_recursive(&p);
            std::fs::remove_dir_all(&p).map_err(|e| {
                log_tag(LogLevel::ERROR, "DELETE", format!("Erro ao deletar: {}", e));
                e.to_string()
            })?;
            log_tag(LogLevel::SUCCESS, "DELETE", format!("Pasta deletada: {}", delete_path));
        }
        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())?
}

pub fn finalize_installation(install_path: String, title: Option<String>) -> Result<InstallationMetadata, String> {
    finalize::finalize_installation(&install_path, title)
}
