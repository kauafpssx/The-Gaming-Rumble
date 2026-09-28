import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { Dices, History } from "lucide-react";

import type { CatalogStats } from "@/domain/catalog";
import type { DownloadState } from "@/domain/download";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

interface LibraryStats {
  count: number;
  usedGb: number;
  freeGb: string;
}

interface ActivityBarProps {
  downloadState: DownloadState | null;
  onExpand: () => void;
  onVersionClick: (version: string) => void;
  hasLastProtocol: boolean;
  onLastProtocolClick: () => void;
  latestProtocolLocked: boolean;
  catalogStats?: CatalogStats | null;
  onRandomGame?: () => void;
  libraryStats?: LibraryStats | null;
}

export function ActivityBar({
  downloadState,
  onExpand,
  onVersionClick,
  hasLastProtocol,
  onLastProtocolClick,
  latestProtocolLocked,
  catalogStats,
  onRandomGame,
  libraryStats,
}: ActivityBarProps) {
  const [diskFree, setDiskFree] = useState("");
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion().then(setVersion).catch(() => {});
  }, []);

  useEffect(() => {
    const targetPath = downloadState?.installPath;
    if (!targetPath) {
      setDiskFree("");
      return;
    }
    const drive = targetPath.includes(":") ? `${targetPath.split("\\")[0]}\\` : targetPath;
    invoke<string>("get_disk_space", { path: drive })
      .then((r) => setDiskFree(r !== "N/A" ? r : ""))
      .catch(() => {});
  }, [downloadState?.installPath]);

  if (downloadState && downloadState.phase !== "done") {
    const isExtracting = downloadState.phase === "extracting";
    const pct = isExtracting ? downloadState.extractionPartPercent ?? 0 : downloadState.progressPercent;
    const isError = downloadState.phase === "error";

    return (
      <button
        type="button"
        onClick={onExpand}
        className="h-10 px-6 border-t border-white/5 bg-[#131315]/90 flex items-center gap-4 text-[10px] uppercase font-bold tracking-widest cursor-pointer hover:bg-[#1b1b1d] transition-colors shrink-0 z-30"
      >
        <span className={cn("truncate max-w-[220px]", isError ? "text-destructive" : "text-primary")}>{downloadState.payload.title}</span>
        <div className="flex-1 h-1.5 rounded-full bg-surface-low overflow-hidden">
          <div
            className={cn("h-full rounded-full", isError ? "bg-destructive" : "bg-primary")}
            style={{ width: `${isError ? 100 : pct}%` }}
          />
        </div>
        <span className="text-slate-500 font-mono normal-case">{isError ? "erro" : `${pct.toFixed(0)}%`}</span>
      </button>
    );
  }

  return (
    <footer className="h-10 px-6 border-t border-white/5 bg-[#131315]/70 flex items-center justify-between text-[9px] uppercase font-black opacity-60 tracking-[0.5em] shrink-0 z-30">
      <div className="flex items-center gap-3">
        <Tooltip content={latestProtocolLocked ? "Bloqueado durante instalacao" : "Reabrir ultimo jogo do protocolo"} disabled={!hasLastProtocol}>
          <button
            type="button"
            onClick={() => !latestProtocolLocked && onLastProtocolClick()}
            disabled={!hasLastProtocol || latestProtocolLocked}
            className="cursor-pointer text-slate-500 transition-colors hover:text-primary disabled:cursor-default disabled:opacity-30"
          >
            <History size={13} />
          </button>
        </Tooltip>
        {diskFree && <span>{diskFree} livre</span>}
      </div>

      {catalogStats && (
        <div className="flex-1 flex items-center justify-center gap-5 normal-case tracking-normal">
          {onRandomGame && (
            <button
              type="button"
              onClick={onRandomGame}
              className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors cursor-pointer uppercase tracking-[0.15em] font-bold text-[9px]"
            >
              <Dices size={12} /> Surpreenda-me
            </button>
          )}
          <div className="hidden md:flex items-center gap-3 border-l border-white/10 pl-4 text-[9px] font-medium text-slate-500">
            <span>Torrents <span className="text-slate-300 font-mono">{catalogStats.onlineFixTotal}</span></span>
            <span className="opacity-30">•</span>
            <span>Steam Sync <span className="text-slate-300 font-mono">{catalogStats.steamWithMetadata}</span></span>
            <span className="opacity-30">•</span>
            <span>Saúde <span className="text-slate-300 font-mono">{catalogStats.matchRate}%</span></span>
          </div>
        </div>
      )}

      {libraryStats && (
        <div className="flex-1 flex items-center justify-center gap-3 normal-case tracking-normal text-[9px] font-medium text-slate-500">
          <span>{libraryStats.count} jogo{libraryStats.count !== 1 ? "s" : ""} instalado{libraryStats.count !== 1 ? "s" : ""}</span>
          <span className="opacity-30">•</span>
          <span><span className="text-slate-300 font-mono">{libraryStats.usedGb.toFixed(1)} GB</span> usados</span>
          {libraryStats.freeGb && (
            <>
              <span className="opacity-30">•</span>
              <span><span className="text-slate-300 font-mono">{libraryStats.freeGb}</span> livres</span>
            </>
          )}
        </div>
      )}

      <Tooltip content="Abrir changelog da versao" disabled={!version}>
        <button
          type="button"
          onClick={() => version && onVersionClick(version)}
          disabled={!version}
          className="cursor-pointer transition-colors hover:text-primary disabled:cursor-default"
        >
          {version ? `v${version}` : ""}
        </button>
      </Tooltip>
    </footer>
  );
}
