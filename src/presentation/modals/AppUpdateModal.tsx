import { AlertCircle, ArrowUpCircle, DownloadCloud, RefreshCw } from "lucide-react";

import type { AppUpdateModalState } from "@/domain/app-update";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface AppUpdateModalProps {
  state: AppUpdateModalState;
  onInstall: () => void;
}

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) return "--";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

const STATUS_LABEL: Record<AppUpdateModalState["stage"], string> = {
  idle: "Preparando atualização",
  available: "Atualização disponível",
  downloading: "Baixando atualização",
  installing: "Instalando atualização",
  error: "Falha na atualização",
};

export function AppUpdateModal({ state, onInstall }: AppUpdateModalProps) {
  if (!state.visible || !state.configured) return null;

  const isBusy = state.stage === "downloading" || state.stage === "installing";
  const isError = state.stage === "error";

  return (
    <Dialog open>
      <DialogContent showClose={false} className="w-[min(560px,92vw)]">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-primary/12 text-primary">
            {isError ? <AlertCircle size={30} /> : <ArrowUpCircle size={30} />}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary">Gaming Rumble</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-white">{STATUS_LABEL[state.stage]}</h2>
            <p className="mt-1 text-sm text-slate-400">{state.currentVersion} {"->"} {state.nextVersion}</p>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-white/6 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-300">
              {isError ? "Erro" : isBusy ? "Progresso" : "Pronto para atualizar"}
            </span>
            <span className="text-sm font-mono text-primary">
              {isBusy ? `${state.progressPercent.toFixed(0)}%` : isError ? "falhou" : "aguardando"}
            </span>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-low">
            <div
              className={cn("h-full rounded-full transition-all duration-300", isError ? "bg-gradient-to-r from-destructive to-[#ff6b6b]" : "bg-gradient-to-r from-primary to-[#01c4f0]")}
              style={{ width: `${Math.max(0, Math.min(100, state.progressPercent))}%` }}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 text-xs uppercase tracking-[0.2em] text-slate-500">
            <span>{state.stage === "installing" ? "Reiniciando aplicativo..." : "Atualização obrigatória"}</span>
            <span>{formatBytes(state.downloadedBytes)} / {formatBytes(state.totalBytes)}</span>
          </div>

          {state.errorMessage && <p className="mt-4 text-sm text-destructive">{state.errorMessage}</p>}
        </div>

        <Button variant="solid" size="lg" className="mt-6 w-full text-[12px] tracking-[0.28em]" disabled={isBusy} onClick={onInstall}>
          {isBusy ? <RefreshCw size={20} className="animate-spin" /> : isError ? <RefreshCw size={20} /> : <DownloadCloud size={20} />}
          {state.stage === "available" && "Atualizar agora"}
          {state.stage === "downloading" && "Baixando atualização"}
          {state.stage === "installing" && "Instalando atualização"}
          {state.stage === "error" && "Tentar novamente"}
          {state.stage === "idle" && "Preparando atualização"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
