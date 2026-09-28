mod cache;
mod normalize;
mod source;

pub mod model;

pub use model::CatalogSyncResult;

pub fn get_cached_catalog() -> Result<Option<CatalogSyncResult>, String> {
    cache::read_cached_catalog()
}

pub async fn sync_catalog() -> Result<CatalogSyncResult, String> {
    let (raw_catalog, raw_stats) = tokio::try_join!(source::fetch_raw_catalog(), source::fetch_raw_stats())?;

    let result = CatalogSyncResult {
        games: normalize::normalize_catalog(raw_catalog),
        stats: normalize::normalize_stats(raw_stats),
        from_cache: false,
    };

    cache::write_cached_catalog(&result)?;
    Ok(result)
}
