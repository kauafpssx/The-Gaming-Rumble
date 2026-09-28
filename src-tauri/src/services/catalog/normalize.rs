use std::collections::HashMap;

use super::model::{
    CatalogAchievement, CatalogEntry, CatalogFile, CatalogHosterLink, CatalogMovie, CatalogStats,
};
use super::source::{RawCatalogFile, RawEntry, RawStats};

fn normalize_entry(raw: RawEntry) -> CatalogEntry {
    let steam = raw.steam;

    let banner = steam.as_ref().and_then(|s| s.header_image.clone()).unwrap_or_default();
    let capsule = steam.as_ref().and_then(|s| s.capsule_imagev5.clone()).unwrap_or_else(|| banner.clone());
    let background = steam.as_ref().and_then(|s| s.background_raw.clone()).unwrap_or_else(|| banner.clone());
    let description = steam.as_ref().and_then(|s| s.short_description.clone()).unwrap_or_default();
    let genres = steam.as_ref().map(|s| s.genres.iter().map(|g| g.description.clone()).collect()).unwrap_or_default();
    let categories = steam.as_ref().map(|s| s.categories.iter().map(|c| c.description.clone()).collect()).unwrap_or_default();
    let price_brl = steam.as_ref().and_then(|s| s.price_brl.clone());
    let is_free = steam.as_ref().map(|s| s.is_free).unwrap_or(false);
    let steam_app_id = steam.as_ref().and_then(|s| s.steam_appid);
    let release_date_steam = steam.as_ref().and_then(|s| s.release_date_steam.clone());
    let controller_support = steam.as_ref().and_then(|s| s.controller_support.clone());
    let ratings_pegi = steam.as_ref().and_then(|s| s.ratings.as_ref()).and_then(|r| r.pegi.clone());
    let ratings_esrb = steam.as_ref().and_then(|s| s.ratings.as_ref()).and_then(|r| r.esrb.clone());
    let requirements_minimum = steam.as_ref().and_then(|s| s.pc_requirements.as_ref()).and_then(|r| r.minimum.clone());
    let requirements_recommended = steam.as_ref().and_then(|s| s.pc_requirements.as_ref()).and_then(|r| r.recommended.clone());
    let achievements_total = steam.as_ref().and_then(|s| s.achievements_total).unwrap_or(0);

    let achievements = steam
        .as_ref()
        .map(|s| {
            s.achievements_highlighted
                .iter()
                .filter_map(|a| {
                    let icon = a.icon.clone()?;
                    Some(CatalogAchievement {
                        name: a.localized_name.clone().or_else(|| a.name.clone()).unwrap_or_default(),
                        icon,
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    let screenshots = steam.as_ref().map(|s| s.screenshots.clone()).unwrap_or_default();

    let movies = steam
        .as_ref()
        .map(|s| {
            s.movies
                .iter()
                .filter_map(|m| {
                    let thumbnail = m.thumbnail.clone()?;
                    Some(CatalogMovie {
                        thumbnail,
                        dash_url: m.dash_h264.clone(),
                        hls_url: m.hls_h264.clone(),
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    let files: Vec<CatalogFile> = raw
        .files
        .iter()
        .map(|f| CatalogFile { name: f.name.clone(), size: f.size.clone() })
        .collect();

    let hoster_links: HashMap<String, Vec<CatalogHosterLink>> = raw
        .hoster_links
        .unwrap_or_default()
        .into_iter()
        .map(|(hoster, links)| {
            let normalized = links
                .into_iter()
                .filter_map(|l| {
                    let file_name = l.file_name.or(l.n)?;
                    let direct_link = l.direct_link.or(l.u)?;
                    Some(CatalogHosterLink { file_name, direct_link })
                })
                .collect::<Vec<_>>();
            (hoster, normalized)
        })
        .filter(|(_, links)| !links.is_empty())
        .collect();

    let parts = if files.is_empty() { 1 } else { files.len() as u32 };

    CatalogEntry {
        id: raw.unique_hash,
        title: raw.title,
        magnet: raw.magnet,
        file_size: raw.file_size,
        parts,
        banner,
        capsule,
        background,
        description,
        genres,
        categories,
        price_brl,
        is_free,
        steam_app_id,
        release_date: raw.release_date.unwrap_or_default(),
        release_date_steam,
        last_update: raw.last_update,
        update_date: raw.update_date,
        created_at: raw.created_at,
        controller_support,
        ratings_pegi,
        ratings_esrb,
        requirements_minimum,
        requirements_recommended,
        achievements_total,
        achievements,
        screenshots,
        movies,
        files,
        hoster_links,
    }
}

pub fn normalize_catalog(raw: RawCatalogFile) -> Vec<CatalogEntry> {
    raw.downloads.into_iter().map(normalize_entry).collect()
}

pub fn normalize_stats(raw: RawStats) -> CatalogStats {
    CatalogStats {
        total_games: raw.total_games,
        online_fix_total: raw.online_fix_total,
        steam_with_metadata: raw.steam_with_metadata,
        games_with_providers: raw.games_with_providers,
        match_rate: raw.match_rate,
        last_scrape_at_display: raw.last_scrape_at_display,
        generated_at_display: raw.generated_at_display,
        latest_run_new_game_names: raw.latest_run_new_game_names,
        latest_run_updated_game_names: raw.latest_run_updated_game_names,
    }
}
