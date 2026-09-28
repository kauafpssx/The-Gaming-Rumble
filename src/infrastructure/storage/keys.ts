export const STORAGE_KEY_DRIVE = "gr_default_drive";
export const DOWNLOAD_STATE_KEY = "gr_download_state";
export const LAST_PROTOCOL_PAYLOAD_KEY = "gr_last_protocol_payload";
export const POST_UPDATE_CHANGELOG_KEY = "gr_post_update_changelog_version";
export const DISABLE_DEFENDER_ON_START_KEY = "gr_disable_defender_on_start";
export const ADMIN_STATUS_CACHE_KEY = "gr_admin_status";
export const LIBRARY_CACHE_PREFIX = "gr_library_cache::";
export const SHORTCUT_CACHE_PREFIX = "gr_shortcut_cache::";
export const SYSTEM_STATUS_CACHE_KEY = "gr_system_status_cache";
export const DRIVES_CACHE_KEY = "gr_drives_cache";
export const SHOW_GAMES_WITHOUT_STEAM_METADATA_KEY = "gr_show_games_without_steam_metadata";

export const libraryCacheKey = (drive: string) => `${LIBRARY_CACHE_PREFIX}${drive}`;
export const shortcutCacheKey = (drive: string) => `${SHORTCUT_CACHE_PREFIX}${drive}`;
