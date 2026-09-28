import type { DownloadState, HttpDownloadFile, LogEntry } from "@/domain/download";
import type { GamePayload } from "@/domain/game";
import {
  addDefenderExclusion,
  deleteFolder,
  openPath,
  startFixDownload,
  startHttpDownload,
  startTorrent,
  stopHttpDownload,
  stopTorrent,
} from "@/infrastructure/tauri/commands";

interface Params {
  setDownloadState: (updater: (prev: DownloadState | null) => DownloadState | null) => void;
  addLog: (tag: LogEntry["tag"], msg: string) => void;
}

function freshDownloadState(
  payload: GamePayload,
  path: string,
  fixOnly: boolean,
  startMsg: string,
  engine: DownloadState["engine"] = "torrent",
  httpFiles?: HttpDownloadFile[]
): DownloadState {
  return {
    payload,
    installPath: path,
    engine,
    httpFiles,
    phase: "downloading",
    currentPart: 0,
    totalParts: payload.parts,
    progressPercent: 0,
    extractionPartPercent: 0,
    speedMBs: 0,
    eta: "0s",
    elapsedTime: "00:00",
    logs: [{ time: new Date().toLocaleTimeString(), tag: "INFO", msg: startMsg }],
    isPaused: false,
    peers: 0,
    seeds: 0,
    fixOnly,
    fixFilePath: undefined,
  };
}

/** Encapsulates the imperative actions available while a download/activity panel is open. */
export function useDownloadActions({ setDownloadState, addLog }: Params) {
  async function startInstall(payload: GamePayload, path: string) {
    setDownloadState(() => freshDownloadState(payload, path, false, "Transmissão Iniciada."));
    try {
      await addDefenderExclusion(path);
    } catch {}
    try {
      await startTorrent(payload.magnet, path);
    } catch (e) {
      addLog("ERROR", `Falha no Motor: ${e}`);
    }
  }

  async function downloadFixOnly(payload: GamePayload, path: string) {
    setDownloadState(() => freshDownloadState(payload, path, true, "Baixando apenas Fix..."));
    try {
      await addDefenderExclusion(path);
    } catch {}
    try {
      await startFixDownload(payload.magnet, path);
    } catch (e) {
      addLog("ERROR", `Falha no Motor: ${e}`);
    }
  }

  /** Baixa direto de um hoster HTTP (ex.: Pixeldrain) em vez de torrent — mesmo pipeline de extração. */
  async function startHttpInstall(payload: GamePayload, path: string, files: HttpDownloadFile[]) {
    setDownloadState(() => freshDownloadState(payload, path, false, "Baixando via HTTP...", "http", files));
    try {
      await addDefenderExclusion(path);
    } catch {}
    try {
      await startHttpDownload(files, path, false);
    } catch (e) {
      addLog("ERROR", `Falha no Motor: ${e}`);
    }
  }

  /** Baixa só o fix direto de um hoster HTTP (ex.: Pixeldrain) em vez de torrent. */
  async function downloadFixOnlyHttp(payload: GamePayload, path: string, url: string, fileName: string) {
    const files: HttpDownloadFile[] = [{ url, fileName }];
    setDownloadState(() => freshDownloadState(payload, path, true, "Baixando apenas Fix (HTTP)...", "http", files));
    try {
      await addDefenderExclusion(path);
    } catch {}
    try {
      await startHttpDownload(files, path, true);
    } catch (e) {
      addLog("ERROR", `Falha no Motor: ${e}`);
    }
  }

  async function pauseOrResume(state: DownloadState) {
    if (state.isPaused) {
      if (state.engine === "http" && state.httpFiles?.length) {
        await startHttpDownload(state.httpFiles, state.installPath, state.fixOnly);
      } else {
        await startTorrent(state.payload.magnet, state.installPath);
      }
      setDownloadState((prev) => (prev ? { ...prev, isPaused: false } : null));
    } else {
      if (state.engine === "http") {
        await stopHttpDownload();
      } else {
        await stopTorrent();
      }
      setDownloadState((prev) => (prev ? { ...prev, isPaused: true } : null));
    }
  }

  async function cancel(state: DownloadState) {
    if (state.engine === "http") {
      await stopHttpDownload();
    } else {
      await stopTorrent();
    }
    // Cancel only ever fires mid-download (or on error) — never after `finish()` — so the
    // folder here is always a partial leftover, fix-only included. Always clean it up:
    // otherwise it clutters `Gaming Rumble\` and, before the reconcile fix, could even get
    // mistaken for a real install.
    await deleteFolder(state.installPath).catch(() => {});
    setDownloadState(() => null);
  }

  async function finish(state: DownloadState) {
    if (state.fixOnly) {
      await openPath(state.installPath, state.fixFilePath || state.installPath, true).catch(() => {});
    }
    setDownloadState(() => null);
  }

  return { startInstall, downloadFixOnly, startHttpInstall, downloadFixOnlyHttp, pauseOrResume, cancel, finish };
}
