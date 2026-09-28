import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type { AppUpdateEvent } from "@/domain/app-update";
import type { LibraryEntryUpdatedEvent } from "@/domain/library";

export interface DownloadFinishedEvent {
  success: boolean;
  fix_only: boolean;
  exit_code?: number | null;
  selected_path?: string | null;
}

export interface DownloadProgressEvent {
  progressPercent: number;
  speedMBs: number;
  eta: string;
  peers: number;
  seeds: number;
}

export interface ExtractProgressEvent {
  type: "preparing" | "extracting" | "extracting_fix" | "cleaning" | "done";
  file?: string;
  current?: number;
  total?: number;
  archive_pct?: number;
  global_pct?: number | string;
}

export const onDeepLink = (cb: (uri: string) => void): Promise<UnlistenFn> =>
  listen<string>("deeplink", (e) => cb(e.payload));

export const onDownloadProgress = (cb: (payload: DownloadProgressEvent) => void): Promise<UnlistenFn> =>
  listen<DownloadProgressEvent>("download-progress", (e) => cb(e.payload));

export const onDownloadFinished = (cb: (payload: DownloadFinishedEvent) => void): Promise<UnlistenFn> =>
  listen<DownloadFinishedEvent>("download-finished", (e) => cb(e.payload));

export const onExtractProgress = (cb: (payload: ExtractProgressEvent) => void): Promise<UnlistenFn> =>
  listen<ExtractProgressEvent>("extract-progress", (e) => cb(e.payload));

export const onAppUpdateEvent = (cb: (payload: AppUpdateEvent) => void): Promise<UnlistenFn> =>
  listen<AppUpdateEvent>("app-update", (e) => cb(e.payload));

export const onAppVisibilityChanged = (cb: (visible: boolean) => void): Promise<UnlistenFn> =>
  listen<boolean>("app-visibility-changed", (e) => cb(e.payload));

export const onLibraryEntryUpdated = (cb: (payload: LibraryEntryUpdatedEvent) => void): Promise<UnlistenFn> =>
  listen<LibraryEntryUpdatedEvent>("library-entry-updated", (e) => cb(e.payload));
