import { invoke } from "@tauri-apps/api/core";

import type { CatalogSyncResult } from "@/domain/catalog";
import type { HttpDownloadFile } from "@/domain/download";
import type { LibraryEntry } from "@/domain/library";
import type { UpdateCheckResponse } from "@/domain/app-update";

export interface DriveInfo {
  name: string;
  label: string;
  free_gb: number;
  total_gb: number;
}

export interface SystemStatus {
  protocol: string;
  protocolActive: boolean;
  aria2Version: string;
  sevenZipVersion: string;
}

export interface DefenderStatus {
  available: boolean;
}

export interface InstallationMetadata {
  size_gb: number;
  executable: string;
}

// Disk / drives
export const listDrives = () => invoke<DriveInfo[]>("list_drives");
export const getDiskSpace = (path: string) => invoke<string>("get_disk_space", { path });

// System / admin / defender
export const checkIsAdmin = () => invoke<boolean>("check_is_admin");
export const createGamingRumbleFolder = (drive: string) => invoke<void>("create_gaming_rumble_folder", { drive });
export const addDefenderExclusion = (path: string) => invoke<void>("add_defender_exclusion", { path });
export const setDefenderRealtimeMonitoring = (disabled: boolean) =>
  invoke<void>("set_defender_realtime_monitoring", { disabled });
export const getDefenderStatus = () => invoke<DefenderStatus>("get_defender_status");
export const getSystemStatus = () => invoke<SystemStatus>("get_system_status");
export const openPath = (path: string, selectFile: string, preferSelect = false) =>
  invoke<void>("open_path", { path, selectFile, preferSelect });
export const showExePicker = (defaultPath: string) => invoke<string | null>("show_exe_picker", { defaultPath });

// Archive / extraction
export const extractGame = (installPath: string) => invoke<void>("extract_game", { installPath });
export const deleteFolder = (path: string) => invoke<void>("delete_folder", { path });
export const finalizeInstallation = (installPath: string, title?: string) =>
  invoke<InstallationMetadata>("finalize_installation", { installPath, title });

// Torrent
export const startTorrent = (magnet: string, installPath: string) =>
  invoke<void>("start_torrent", { magnet, installPath });
export const stopTorrent = () => invoke<void>("stop_torrent");
export const startFixDownload = (magnet: string, installPath: string) =>
  invoke<void>("start_fix_download", { magnet, installPath });
export const startHttpDownload = (files: HttpDownloadFile[], installPath: string, fixOnly: boolean) =>
  invoke<void>("start_http_download", { files, installPath, fixOnly });
export const stopHttpDownload = () => invoke<void>("stop_http_download");

// Library
export const reconcileLibrary = (drive: string) => invoke<LibraryEntry[]>("reconcile_library", { drive });
export const addToLibrary = (drive: string, entry: LibraryEntry) => invoke<void>("add_to_library", { drive, entry });
export const removeFromLibrary = (drive: string, title: string) =>
  invoke<void>("remove_from_library", { drive, title });
export const deleteAllGames = (drive: string) => invoke<void>("delete_all_games", { drive });
export const updateExecutable = (drive: string, title: string, executable: string) =>
  invoke<void>("update_executable", { drive, title, executable });

// Play / shortcuts
export const playGame = (executable: string) => invoke<void>("play_game", { executable });
export const launchAndTrackGame = (drive: string, title: string, executable: string, installPath: string) =>
  invoke<void>("launch_and_track_game", { drive, title, executable, installPath });
export const createShortcut = (title: string, executable: string, icon?: string) =>
  invoke<void>("create_shortcut", { title, executable, icon });
export const removeShortcut = (title: string) => invoke<void>("remove_shortcut", { title });
export const getShortcutStates = (titles: string[]) =>
  invoke<Record<string, boolean>>("get_shortcut_states", { titles });

// Deep-link / app update
export const consumePendingDeeplink = () => invoke<string | null>("consume_pending_deeplink");
export const checkForAppUpdate = () => invoke<UpdateCheckResponse>("check_for_app_update");
export const installAppUpdate = () => invoke<void>("install_app_update");

// Catalog
export const getCachedCatalog = () => invoke<CatalogSyncResult | null>("get_cached_catalog");
export const syncCatalog = () => invoke<CatalogSyncResult>("sync_catalog");
