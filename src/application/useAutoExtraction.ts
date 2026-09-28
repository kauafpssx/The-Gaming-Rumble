import { useEffect, useRef } from "react";

import type { DownloadState, LogEntry } from "@/domain/download";
import { driveOfPath } from "@/domain/library";
import { addToLibrary, createShortcut, extractGame, finalizeInstallation } from "@/infrastructure/tauri/commands";

interface Params {
  downloadState: DownloadState | null;
  setDownloadState: (updater: (prev: DownloadState | null) => DownloadState | null) => void;
  addLog: (tag: LogEntry["tag"], msg: string) => void;
}

/**
 * Runs "extract & destroy" once a torrent finishes downloading.
 * Uses `downloadState.payload` (captured once when the download started) rather than
 * the transient "active game" selection, which is cleared as soon as the download begins.
 */
export function useAutoExtraction({ downloadState, setDownloadState, addLog }: Params) {
  const extractionRunKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (downloadState?.phase !== "extracting") {
      extractionRunKeyRef.current = null;
      return;
    }

    const payload = downloadState.payload;
    const extractionKey = `${downloadState.installPath}::${payload.title}`;
    if (extractionRunKeyRef.current === extractionKey) return;
    extractionRunKeyRef.current = extractionKey;

    const run = async () => {
      try {
        addLog("INFO", "Iniciando varredura e extração dinâmica (Gatling Extract)...");
        await extractGame(downloadState.installPath);

        addLog("INFO", "Processando lixo e finalizando instalação...");
        const meta = await finalizeInstallation(downloadState.installPath, payload.title);

        await addToLibrary(driveOfPath(downloadState.installPath), {
          title: payload.title,
          install_path: downloadState.installPath,
          executable: meta.executable,
          banner: payload.banner,
          size_gb: meta.size_gb,
          play_time_ms: 0,
        });

        createShortcut(payload.title, meta.executable, meta.executable)
          .then(() => addLog("INFO", "Atalho criado no Menu Iniciar."))
          .catch((e) => console.warn("Falha ao criar atalho:", e));

        setDownloadState((prev) => (prev ? { ...prev, phase: "done", progressPercent: 100, extractionPartPercent: 100 } : null));
        addLog("SUCCESS", "Protocolo finalizado e adicionado à biblioteca.");
      } catch (e) {
        addLog("ERROR", `Falha na extração: ${e}`);
        setDownloadState((prev) => (prev ? { ...prev, phase: "error", errorMessage: `Falha na extração: ${e}` } : null));
      }
    };

    void run();
  }, [downloadState?.phase, downloadState?.payload, downloadState?.installPath, addLog]);
}
