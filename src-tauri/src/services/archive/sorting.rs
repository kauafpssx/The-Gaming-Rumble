use std::cmp::Ordering;
use std::collections::HashSet;
use std::path::{Path, PathBuf};

use crate::commands::logger::{log_tag, LogLevel};

#[derive(Debug, Clone, Eq, PartialEq)]
struct ArchiveSortKey {
    kind_rank: u8,
    group_name: String,
    part_number: Option<u32>,
    file_name: String,
}

pub fn parse_multi_part_info(file_name: &str) -> Option<(String, u32)> {
    let lower = file_name.to_lowercase();
    let dot_part = lower.find(".part")?;
    let part_digits_start = dot_part + 5;
    let digits: String = lower[part_digits_start..]
        .chars()
        .take_while(|ch| ch.is_ascii_digit())
        .collect();

    if digits.is_empty() {
        return None;
    }

    let part_number = digits.parse::<u32>().ok()?;
    let group_name = format!(
        "{}{}",
        &lower[..dot_part],
        &lower[part_digits_start + digits.len()..]
    );

    Some((group_name, part_number))
}

fn archive_sort_key(path: &Path) -> ArchiveSortKey {
    let file_name = path.file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_default();
    let lower_name = file_name.to_lowercase();

    if let Some((group_name, part_number)) = parse_multi_part_info(&lower_name) {
        return ArchiveSortKey {
            kind_rank: 0,
            group_name,
            part_number: Some(part_number),
            file_name: lower_name,
        };
    }

    ArchiveSortKey {
        kind_rank: 1,
        group_name: lower_name.clone(),
        part_number: None,
        file_name: lower_name,
    }
}

pub fn compare_archives(a: &PathBuf, b: &PathBuf) -> Ordering {
    let a_key = archive_sort_key(a);
    let b_key = archive_sort_key(b);

    a_key.kind_rank.cmp(&b_key.kind_rank)
        .then_with(|| a_key.group_name.cmp(&b_key.group_name))
        .then_with(|| a_key.part_number.unwrap_or(0).cmp(&b_key.part_number.unwrap_or(0)))
        .then_with(|| a_key.file_name.cmp(&b_key.file_name))
}

pub fn dedupe_extract_roots(archives: Vec<PathBuf>) -> Vec<PathBuf> {
    let mut result = Vec::new();
    let mut seen_groups = HashSet::new();

    for archive in archives {
        let file_name = archive.file_name()
            .map(|name| name.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        if let Some((group_name, _)) = parse_multi_part_info(&file_name) {
            if seen_groups.insert(group_name) {
                result.push(archive);
            } else {
                log_tag(LogLevel::DEBUG, "EXTRACT", format!("Ignorando volume adicional multipart: {}", file_name));
            }
        } else {
            result.push(archive);
        }
    }

    result
}
