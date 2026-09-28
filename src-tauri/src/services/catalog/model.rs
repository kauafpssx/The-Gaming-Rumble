use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct CatalogFile {
    pub name: String,
    pub size: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CatalogMovie {
    pub thumbnail: String,
    #[serde(rename = "dashUrl")]
    pub dash_url: Option<String>,
    #[serde(rename = "hlsUrl")]
    pub hls_url: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CatalogAchievement {
    pub name: String,
    pub icon: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CatalogHosterLink {
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "directLink")]
    pub direct_link: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CatalogEntry {
    pub id: String,
    pub title: String,
    pub magnet: String,
    #[serde(rename = "fileSize")]
    pub file_size: String,
    pub parts: u32,
    pub banner: String,
    pub capsule: String,
    pub background: String,
    pub description: String,
    pub genres: Vec<String>,
    pub categories: Vec<String>,
    #[serde(rename = "priceBrl")]
    pub price_brl: Option<String>,
    #[serde(rename = "isFree")]
    pub is_free: bool,
    #[serde(rename = "steamAppId")]
    pub steam_app_id: Option<u64>,
    #[serde(rename = "releaseDate")]
    pub release_date: String,
    #[serde(rename = "releaseDateSteam")]
    pub release_date_steam: Option<String>,
    #[serde(rename = "lastUpdate")]
    pub last_update: Option<String>,
    #[serde(rename = "updateDate")]
    pub update_date: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: Option<String>,
    #[serde(rename = "controllerSupport")]
    pub controller_support: Option<String>,
    #[serde(rename = "ratingsPegi")]
    pub ratings_pegi: Option<String>,
    #[serde(rename = "ratingsEsrb")]
    pub ratings_esrb: Option<String>,
    #[serde(rename = "requirementsMinimum")]
    pub requirements_minimum: Option<String>,
    #[serde(rename = "requirementsRecommended")]
    pub requirements_recommended: Option<String>,
    #[serde(rename = "achievementsTotal")]
    pub achievements_total: u32,
    pub achievements: Vec<CatalogAchievement>,
    pub screenshots: Vec<String>,
    pub movies: Vec<CatalogMovie>,
    pub files: Vec<CatalogFile>,
    #[serde(rename = "hosterLinks")]
    pub hoster_links: HashMap<String, Vec<CatalogHosterLink>>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CatalogStats {
    #[serde(rename = "totalGames")]
    pub total_games: u64,
    #[serde(rename = "onlineFixTotal")]
    pub online_fix_total: u64,
    #[serde(rename = "steamWithMetadata")]
    pub steam_with_metadata: u64,
    #[serde(rename = "gamesWithProviders")]
    pub games_with_providers: u64,
    #[serde(rename = "matchRate")]
    pub match_rate: f64,
    #[serde(rename = "lastScrapeAtDisplay")]
    pub last_scrape_at_display: String,
    #[serde(rename = "generatedAtDisplay")]
    pub generated_at_display: String,
    #[serde(rename = "latestRunNewGameNames")]
    pub latest_run_new_game_names: Vec<String>,
    #[serde(rename = "latestRunUpdatedGameNames")]
    pub latest_run_updated_game_names: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CatalogSyncResult {
    pub games: Vec<CatalogEntry>,
    pub stats: CatalogStats,
    #[serde(rename = "fromCache")]
    pub from_cache: bool,
}
