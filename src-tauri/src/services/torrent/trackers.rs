use std::sync::LazyLock;

/// Curated fallback tracker list (same set used by Hydra Launcher) appended to every
/// magnet link to speed up peer discovery beyond whatever trackers the magnet itself carries.
static FALLBACK_TRACKERS: LazyLock<Vec<String>> = LazyLock::new(|| {
    serde_json::from_str::<Vec<String>>(include_str!("trackers.json")).unwrap_or_default()
});

fn url_encode(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char)
            }
            _ => out.push_str(&format!("%{:02X}", byte)),
        }
    }
    out
}

/// Appends the fallback tracker list to a magnet link's own `tr=` params (deduplicated),
/// so `librqbit` — which for magnet links only announces to trackers found in the URI
/// itself — gets a much larger swarm to pull peers from immediately.
pub fn augment_magnet(magnet: &str) -> String {
    let existing: std::collections::HashSet<String> = magnet
        .split('&')
        .filter_map(|part| part.strip_prefix("tr=").map(|t| t.to_string()))
        .collect();

    let mut augmented = magnet.to_string();
    for tracker in FALLBACK_TRACKERS.iter() {
        let encoded = url_encode(tracker);
        if existing.contains(&encoded) || existing.contains(tracker.as_str()) {
            continue;
        }
        augmented.push_str("&tr=");
        augmented.push_str(&encoded);
    }
    augmented
}
