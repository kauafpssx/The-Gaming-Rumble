use std::collections::HashMap;
use serde::Deserialize;

const GAMES_URL: &str = "https://raw.githubusercontent.com/kauafpssx/The-Gaming-Rumble/refs/heads/games/online_fix_games.json";
const STATS_URL: &str = "https://raw.githubusercontent.com/kauafpssx/The-Gaming-Rumble/refs/heads/games/stats.json";

#[derive(Deserialize)]
pub struct RawCatalogFile {
    pub downloads: Vec<RawEntry>,
}

#[derive(Deserialize)]
pub struct RawEntry {
    pub title: String,
    pub magnet: String,
    #[serde(rename = "fileSize")]
    pub file_size: String,
    pub unique_hash: String,
    pub release_date: Option<String>,
    pub last_update: Option<String>,
    pub update_date: Option<String>,
    pub created_at: Option<String>,
    #[serde(default)]
    pub files: Vec<RawFile>,
    pub steam: Option<RawSteam>,
    pub hoster_links: Option<HashMap<String, Vec<RawHosterLink>>>,
}

#[derive(Deserialize, Clone)]
pub struct RawFile {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub size: String,
}

#[derive(Deserialize)]
pub struct RawHosterLink {
    pub file_name: Option<String>,
    pub direct_link: Option<String>,
    /// Legacy short field names used by older dataset snapshots.
    pub n: Option<String>,
    pub u: Option<String>,
}

#[derive(Deserialize)]
pub struct RawSteam {
    pub steam_appid: Option<u64>,
    pub header_image: Option<String>,
    pub capsule_imagev5: Option<String>,
    pub background_raw: Option<String>,
    #[serde(default)]
    pub screenshots: Vec<String>,
    #[serde(default)]
    pub movies: Vec<RawMovie>,
    pub achievements_total: Option<u32>,
    #[serde(default)]
    pub achievements_highlighted: Vec<RawAchievement>,
    pub ratings: Option<RawRatings>,
    pub release_date_steam: Option<String>,
    pub short_description: Option<String>,
    pub price_brl: Option<String>,
    #[serde(default)]
    pub is_free: bool,
    pub pc_requirements: Option<RawRequirements>,
    pub controller_support: Option<String>,
    #[serde(default)]
    pub genres: Vec<RawTag>,
    #[serde(default)]
    pub categories: Vec<RawTag>,
}

#[derive(Deserialize)]
pub struct RawMovie {
    pub thumbnail: Option<String>,
    pub dash_h264: Option<String>,
    pub hls_h264: Option<String>,
}

#[derive(Deserialize)]
pub struct RawAchievement {
    pub name: Option<String>,
    pub localized_name: Option<String>,
    pub icon: Option<String>,
}

#[derive(Deserialize)]
pub struct RawRatings {
    pub pegi: Option<String>,
    pub esrb: Option<String>,
}

#[derive(Deserialize)]
pub struct RawRequirements {
    pub minimum: Option<String>,
    pub recommended: Option<String>,
}

#[derive(Deserialize)]
pub struct RawTag {
    pub description: String,
}

#[derive(Deserialize)]
pub struct RawStats {
    pub total_games: u64,
    pub online_fix_total: u64,
    pub steam_with_metadata: u64,
    pub games_with_providers: u64,
    pub match_rate: f64,
    pub last_scrape_at_display: String,
    pub generated_at_display: String,
    #[serde(default)]
    pub latest_run_new_game_names: Vec<String>,
    #[serde(default)]
    pub latest_run_updated_game_names: Vec<String>,
}

pub async fn fetch_raw_catalog() -> Result<RawCatalogFile, String> {
    let client = reqwest::Client::new();
    let text = client.get(GAMES_URL).send().await.map_err(|e| e.to_string())?
        .text().await.map_err(|e| e.to_string())?;
    serde_json::from_str(&text).map_err(|e| format!("Falha ao interpretar cat\u{e1}logo remoto: {}", e))
}

pub async fn fetch_raw_stats() -> Result<RawStats, String> {
    let client = reqwest::Client::new();
    client.get(STATS_URL).send().await.map_err(|e| e.to_string())?
        .json::<RawStats>().await.map_err(|e| format!("Falha ao interpretar estat\u{ed}sticas do cat\u{e1}logo: {}", e))
}
