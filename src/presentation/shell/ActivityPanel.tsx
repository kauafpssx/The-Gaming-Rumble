import { motion } from "framer-motion";
import { CircleX, FolderOpen, PauseCircle, Play } from "lucide-react";

import type { DownloadState } from "@/domain/download";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface ActivityPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: DownloadState | null;
  isPaused: boolean;
  onPause?: () => void;
  onCancel?: () => void;
  onStartGame?: () => void;
}

export function ActivityPanel({ open, onOpenChange, state, isPaused, onPause, onCancel, onStartGame }: ActivityPanelProps) {
  if (!state) return null;

  const { payload, progressPercent, extractionPartPercent, speedMBs, eta, elapsedTime, phase, peers, fixOnly, errorMessage } = state;
  const isDone = phase === "done";
  const isExtracting = phase === "extracting";
  const isError = phase === "error";
  const primaryPercent = isExtracting ? (extractionPartPercent ?? 0) : progressPercent;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="font-bold uppercase">
        <div className="-mx-6 -mt-6 mb-4 h-32 w-[calc(100%+3rem)] shrink-0 overflow-hidden relative">
          <img src={payload.banner} alt={payload.title} className="h-full w-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
        </div>

        <SheetHeader>
          <span className="text-[9px] tracking-[0.4em] text-primary font-mono">
            {isDone ? "PROTOCOLO FINALIZADO" : isExtracting ? "REESTRUTURANDO NÚCLEO" : "TRANSMISSÃO ATIVA"}
          </span>
          <SheetTitle className="truncate">{payload.title}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar">
          <div>
            <span className={cn("text-5xl font-black font-mono leading-none", isError ? "text-destructive" : "text-primary")}>
              {isError ? "ERRO" : primaryPercent.toFixed(isExtracting ? 0 : 2)}
              {isError ? "" : "%"}
            </span>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full border border-white/5 bg-surface-low">
              <motion.div
                className={cn("h-full bg-gradient-to-r", isError ? "from-destructive to-[#ff6b6b]" : isDone ? "from-[#4ade80] to-[#22c55e]" : "from-primary to-[#01c4f0]")}
                initial={false}
                animate={{ width: `${isError ? 100 : progressPercent}%` }}
                transition={{ type: "spring", stiffness: 45, damping: 15 }}
              />
            </div>
          </div>

          {isError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-center text-destructive text-[10px] tracking-widest">
              {errorMessage || "Falha no protocolo."}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/5 bg-surface-low p-4">
                <span className="text-[9px] text-slate-500">Tempo decorrido</span>
                <p className="text-lg text-white font-mono">{elapsedTime}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-surface-low p-4">
                <span className="text-[9px] text-slate-500">Peers conectados</span>
                <p className="text-lg text-white font-mono">{peers || 0}</p>
              </div>
              {!isDone && speedMBs > 0 && (
                <>
                  <div className="rounded-2xl border border-white/5 bg-surface-low p-4">
                    <span className="text-[9px] text-slate-500">Velocidade</span>
                    <p className="text-lg text-white font-mono">{speedMBs.toFixed(1)} mb/s</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-surface-low p-4">
                    <span className="text-[9px] text-slate-500">ETA</span>
                    <p className="text-lg text-white font-mono">{eta || "--:--"}</p>
                  </div>
                </>
              )}
            </div>
          )}

          {!isDone && !isError && (
            <div className="mt-auto flex gap-3">
              <button onClick={onPause} className="flex-1 h-14 rounded-2xl border border-white/5 bg-white/[0.03] text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-white/[0.08] transition-all cursor-pointer">
                {isPaused ? <Play size={18} /> : <PauseCircle size={18} />} {isPaused ? "RETOMAR" : "PAUSAR"}
              </button>
              <button onClick={onCancel} className="flex-1 h-14 rounded-2xl border border-destructive/10 bg-destructive/5 text-destructive text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-destructive/15 transition-all cursor-pointer">
                <CircleX size={18} /> CANCELAR
              </button>
            </div>
          )}

          {isError && onCancel && (
            <button onClick={onCancel} className="mt-auto h-14 rounded-2xl border border-destructive/10 bg-destructive/5 text-destructive text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-destructive/15 transition-all cursor-pointer">
              <CircleX size={18} /> CANCELAR
            </button>
          )}

          {isDone && onStartGame && (
            <button
              onClick={onStartGame}
              className={cn(
                "mt-auto h-16 rounded-2xl flex items-center justify-center gap-3 text-lg italic cursor-pointer",
                fixOnly ? "bg-gradient-to-br from-primary to-primary-container text-on-primary" : "bg-gradient-to-br from-[#4ade80] to-[#22c55e] text-[#002d13]"
              )}
            >
              {fixOnly ? <FolderOpen size={26} /> : <Play size={26} />}
              <span className="tracking-[0.2em]">{fixOnly ? "ABRIR PASTA" : "INICIAR JOGO"}</span>
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
