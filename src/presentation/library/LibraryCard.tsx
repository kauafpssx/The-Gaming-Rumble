import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Folder, FolderOpen, Gamepad2, HardDrive, Hourglass, Link2, Play, Terminal, Trash2, X } from "lucide-react";

import type { LibraryEntry } from "@/domain/library";
import { driveOfPath } from "@/domain/library";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

function formatPlaytime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h${minutes}m${seconds}s`;
  if (minutes > 0) return `${minutes}m${seconds}s`;
  return `${seconds}s`;
}

interface LibraryCardProps {
  game: LibraryEntry;
  hasShortcut: boolean;
  isConfirmingRemoval: boolean;
  isPickingExe: boolean;
  onPlay: (game: LibraryEntry) => void;
  onOpenFolder: (game: LibraryEntry) => void;
  onChangeExe: (game: LibraryEntry) => void;
  onToggleShortcut: (game: LibraryEntry) => void;
  onRequestRemove: (title: string | null) => void;
  onConfirmRemove: (game: LibraryEntry) => void;
}

export function LibraryCard({
  game,
  hasShortcut,
  isConfirmingRemoval,
  isPickingExe,
  onPlay,
  onOpenFolder,
  onChangeExe,
  onToggleShortcut,
  onRequestRemove,
  onConfirmRemove,
}: LibraryCardProps) {
  const [imgError, setImgError] = useState(false);
  const hasBanner = Boolean(game.banner) && !imgError;

  return (
    <div className="relative group bg-card rounded-2xl overflow-hidden border border-white/5 flex flex-col hover:border-white/10 transition-all duration-300">
      <div className="h-32 w-full overflow-hidden relative bg-surface-low">
        {hasBanner ? (
          <img
            src={game.banner}
            alt={game.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/15 to-background flex items-center justify-center">
            <Gamepad2 size={32} className="text-slate-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent pointer-events-none" />
      </div>

      <div className="p-5 relative z-10 flex-col flex flex-1 bg-gradient-to-b from-card to-[#0a0a0a]">
        <h3 className="text-lg font-bold text-white/90 uppercase tracking-wide truncate">{game.title}</h3>
        <div className="mt-2 flex items-center gap-4 text-xs font-mono text-slate-500 tracking-wider min-w-0">
          <span className="flex items-center gap-1.5 shrink-0"><HardDrive size={13} /> {driveOfPath(game.install_path).replace(/\\$/, "")}</span>
          <span className="flex items-center gap-1.5 shrink-0"><Folder size={13} /> {(game.size_gb || 0).toFixed(1)} GB</span>
          <span className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
            <Terminal size={13} className="shrink-0" />
            {game.executable ? game.executable.split("\\").pop() : "N/A"}
          </span>
          <span className="shrink-0 text-[11px] tracking-[0.16em] text-primary/80">{formatPlaytime(game.play_time_ms)}</span>
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          <Tooltip content="Abrir pasta">
            <button onClick={() => onOpenFolder(game)} className="h-10 flex-1 bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all border border-white/5 cursor-pointer">
              <FolderOpen size={16} />
            </button>
          </Tooltip>
          <Tooltip content="Trocar executavel" disabled={isPickingExe}>
            <button onClick={() => onChangeExe(game)} disabled={isPickingExe} className="h-10 flex-1 bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all border border-white/5 cursor-pointer disabled:opacity-60 disabled:cursor-wait">
              {isPickingExe ? <Hourglass size={16} /> : <Terminal size={16} />}
            </button>
          </Tooltip>
          <Tooltip content={hasShortcut ? "Remover atalho" : "Criar atalho"}>
            <button
              onClick={() => onToggleShortcut(game)}
              className={cn(
                "h-10 flex-1 rounded-xl flex items-center justify-center transition-all border cursor-pointer",
                hasShortcut ? "bg-destructive/10 hover:bg-destructive hover:text-white text-destructive border-destructive/20" : "bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white border-white/5"
              )}
            >
              <Link2 size={16} />
            </button>
          </Tooltip>

          <motion.div
            animate={{ width: isConfirmingRemoval ? 112 : 40 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className={cn("h-10 shrink-0 rounded-xl border overflow-hidden", isConfirmingRemoval ? "bg-destructive/10 text-red-100 border-destructive/30" : "bg-destructive/10 text-destructive border-destructive/20")}
          >
            {isConfirmingRemoval ? (
              <div className="h-full flex items-center justify-center gap-2 px-2">
                <button onClick={() => onConfirmRemove(game)} className="h-7 w-7 rounded-lg bg-destructive text-white flex items-center justify-center hover:brightness-110 transition-colors cursor-pointer">
                  <Check size={13} />
                </button>
                <button onClick={() => onRequestRemove(null)} className="h-7 w-7 rounded-lg bg-white/10 text-red-100 flex items-center justify-center hover:bg-white/15 transition-colors cursor-pointer">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <Tooltip content="Desinstalar">
                <button onClick={() => onRequestRemove(game.title)} className="h-full w-full flex items-center justify-center hover:bg-destructive hover:text-white transition-all cursor-pointer">
                  <Trash2 size={16} />
                </button>
              </Tooltip>
            )}
          </motion.div>
        </div>

        <button
          onClick={() => onPlay(game)}
          className="mt-3 h-11 bg-primary/10 hover:bg-primary/20 text-primary hover:text-white rounded-xl px-4 font-bold tracking-widest text-xs uppercase flex items-center justify-center gap-3 transition-colors border border-primary/20 cursor-pointer"
        >
          <Play size={14} />
          <span>Iniciar</span>
        </button>
      </div>
    </div>
  );
}
