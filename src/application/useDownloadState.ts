import { useCallback, useEffect, useState } from "react";

import type { DownloadState, LogEntry } from "@/domain/download";
import { DOWNLOAD_STATE_KEY } from "@/infrastructure/storage/keys";
import { readJson, remove, writeJson } from "@/infrastructure/storage/local-storage";

/** Owns the active download/extraction state, persisted to localStorage (survives HMR/reload). */
export function useDownloadState() {
  const [downloadState, setDownloadState] = useState<DownloadState | null>(() => readJson(DOWNLOAD_STATE_KEY));

  useEffect(() => {
    if (downloadState) writeJson(DOWNLOAD_STATE_KEY, downloadState);
    else remove(DOWNLOAD_STATE_KEY);
  }, [downloadState]);

  const addLog = useCallback((tag: LogEntry["tag"], msg: string) => {
    setDownloadState((prev) =>
      prev ? { ...prev, logs: [...prev.logs, { time: new Date().toLocaleTimeString(), tag, msg }] } : null
    );
    console.log(`[${tag}] ${msg}`);
  }, []);

  // Elapsed-time ticker while a download is in progress.
  useEffect(() => {
    if (!downloadState || downloadState.phase !== "downloading") return;

    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(elapsed / 3600).toString().padStart(2, "0");
      const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, "0");
      const s = (elapsed % 60).toString().padStart(2, "0");
      setDownloadState((prev) => (prev ? { ...prev, elapsedTime: `${h}:${m}:${s}` } : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [downloadState?.phase]);

  return { downloadState, setDownloadState, addLog };
}
