use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct LibraryEntry {
    pub title: String,
    pub install_path: String,
    pub executable: String,
    pub banner: String,
    pub size_gb: f64,
    #[serde(default)]
    pub play_time_ms: u64,
}

#[derive(Serialize, Deserialize)]
pub struct LibraryConfig {
    pub games: Vec<LibraryEntry>,
}
