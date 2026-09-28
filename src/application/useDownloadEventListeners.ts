import { useEffect } from "react";

import type { DownloadState, LogEntry } from "@/domain/download";
import { onDownloadFinished, onDownloadProgress, onExtractProgress } from "@/infrastructure/tauri/events";

/** Wires download-progress / download-finished / extract-progress Tauri events onto downloadState. */
export function useDownloadEventListeners(setDownloadState: (updater: (prev: DownloadState | null) => DownloadState | null) => void) {
  useEffect(() => {
    const unProgress = onDownloadProgress((data) => {
      setDownloadState((prev) => {
        if (!prev || prev.phase !== "downloading") return prev;
        return {
          ...prev,
          progressPercent: data.progressPercent,
          speedMBs: data.speedMBs,
          eta: data.eta,
          peers: data.peers,
          seeds: data.seeds,
        };
      });
    });

    const unFinished = onDownloadFinished((data) => {
      setDownloadState((prev) => {
        if (!prev || prev.phase !== "downloading") return prev;

        if (!data.success) {
          return {
            ...prev,
            phase: "error" as const,
            errorMessage: prev.errorMessage || `Falha ao finalizar download (aria2 exit ${data.exit_code ?? "desconhecido"}).`,
          };
        }

        if (data.fix_only || prev.fixOnly) {
          return {
            ...prev,
            phase: "done" as const,
            progressPercent: 100,
            extractionPartPercent: 100,
            speedMBs: 0,
            eta: "--",
            fixFilePath: data.selected_path ?? prev.fixFilePath,
          };
        }

        return { ...prev, phase: "extracting" as const, progressPercent: 100, speedMBs: 0, eta: "--" };
      });
    });

    const unExtract = onExtractProgress((data) => {
      setDownloadState((prev) => {
        if (!prev) return prev;

        if (data.type === "extracting" || data.type === "extracting_fix") {
          const archivePct = typeof data.archive_pct === "number" ? data.archive_pct : 0;
          const rawGlobalPct =
            typeof data.global_pct === "string"
              ? parseFloat(data.global_pct)
              : typeof data.global_pct === "number"
                ? data.global_pct
                : (((data.current ?? 1) - 1) / (data.total ?? 1)) * 100;
          const globalPct = Number.isFinite(rawGlobalPct) ? rawGlobalPct : prev.progressPercent;
          const nextLog: LogEntry = {
            time: new Date().toLocaleTimeString(),
            tag: "EXTRACTING",
            msg: `${data.type === "extracting_fix" ? "[FIX] " : ""}${data.file} • ${archivePct.toFixed(0)}%`,
          };
          const nextLogs = [...prev.logs];
          if (nextLogs[nextLogs.length - 1]?.tag === "EXTRACTING") nextLogs[nextLogs.length - 1] = nextLog;
          else nextLogs.push(nextLog);

          return {
            ...prev,
            phase: "extracting" as const,
            currentPart: typeof data.current === "number" ? data.current : prev.currentPart,
            totalParts: typeof data.total === "number" ? data.total : prev.totalParts,
            progressPercent: globalPct,
            extractionPartPercent: archivePct,
            speedMBs: 0,
            eta: "--",
            logs: nextLogs,
          };
        }

        if (data.type === "cleaning") {
          return {
            ...prev,
            progressPercent: 95,
            extractionPartPercent: 100,
            logs: [...prev.logs, { time: new Date().toLocaleTimeString(), tag: "CLEANING" as const, msg: "Limpando arquivos..." }],
          };
        }

        if (data.type === "done") {
          return { ...prev, progressPercent: 100, extractionPartPercent: 100 };
        }

        return prev;
      });
    });

    return () => {
      unProgress.then((f) => f());
      unFinished.then((f) => f());
      unExtract.then((f) => f());
    };
  }, [setDownloadState]);
}
