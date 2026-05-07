import { Icon } from "./Icon";

export type AppUpdateStage = "idle" | "available" | "downloading" | "installing" | "error";

export interface AppUpdateModalState {
  visible: boolean;
  configured: boolean;
  stage: AppUpdateStage;
  currentVersion: string;
  nextVersion: string;
  notes: string;
  progressPercent: number;
  downloadedBytes: number;
  totalBytes: number | null;
  errorMessage: string;
}

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

export function AppUpdateModal({ state, onInstall }: AppUpdateModalProps) {
  if (!state.visible || !state.configured) return null;

  const isBusy = state.stage === "downloading" || state.stage === "installing";
  const isError = state.stage === "error";

  const statusLabel =
    state.stage === "available"
      ? "Atualização disponível"
      : state.stage === "downloading"
        ? "Baixando atualização"
        : state.stage === "installing"
          ? "Instalando atualização"
          : state.stage === "error"
            ? "Falha na atualização"
            : "Preparando atualização";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#050507]/92 backdrop-blur-md px-5">
      <div className="w-[min(560px,100%)] rounded-[30px] border border-white/10 bg-[#0f1013] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#a4e6ff]/12 text-[#a4e6ff]">
            <Icon name={isError ? "error" : "system_update_alt"} size={30} fill={1} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#a4e6ff]">Gaming Rumble</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-white">{statusLabel}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {state.currentVersion} {"->"} {state.nextVersion}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-white/6 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-300">
              {isError ? "Erro" : isBusy ? "Progresso" : "Pronto para atualizar"}
            </span>
            <span className="text-sm font-mono text-[#a4e6ff]">
              {isBusy ? `${state.progressPercent.toFixed(0)}%` : isError ? "falhou" : "aguardando"}
            </span>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#1b1b1d]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isError
                  ? "bg-gradient-to-r from-[#ffb4ab] to-[#ff6b6b]"
                  : "bg-gradient-to-r from-[#a4e6ff] to-[#01c4f0]"
              }`}
              style={{ width: `${Math.max(0, Math.min(100, state.progressPercent))}%` }}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 text-xs uppercase tracking-[0.2em] text-slate-500">
            <span>{state.stage === "installing" ? "Reiniciando aplicativo..." : "Atualização obrigatória"}</span>
            <span>{formatBytes(state.downloadedBytes)} / {formatBytes(state.totalBytes)}</span>
          </div>

          {state.errorMessage && (
            <p className="mt-4 text-sm text-[#ffb4ab]">{state.errorMessage}</p>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={onInstall}
            disabled={isBusy}
            className="flex h-16 w-full cursor-pointer items-center justify-center gap-3 rounded-[22px] bg-gradient-to-br from-[#a4e6ff] to-[#01c4f0] text-[12px] font-black uppercase tracking-[0.28em] text-[#032430] transition-all hover:brightness-105 disabled:cursor-default disabled:opacity-70"
          >
            <Icon name={isBusy ? "sync" : isError ? "refresh" : "download"} size={22} fill={1} className={isBusy ? "animate-spin" : ""} />
            <span>
              {state.stage === "available" && "Atualizar agora"}
              {state.stage === "downloading" && "Baixando atualização"}
              {state.stage === "installing" && "Instalando atualização"}
              {state.stage === "error" && "Tentar novamente"}
              {state.stage === "idle" && "Preparando atualização"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
