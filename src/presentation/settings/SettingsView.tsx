import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { CheckCircle2, HardDrive, ShieldAlert, ShieldCheck } from "lucide-react";

import type { CatalogStats } from "@/domain/catalog";
import { getSystemStatus, type SystemStatus } from "@/infrastructure/tauri/commands";
import { SYSTEM_STATUS_CACHE_KEY } from "@/infrastructure/storage/keys";
import { readJson, writeJson } from "@/infrastructure/storage/local-storage";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

import { CatalogMetadataToggle } from "./CatalogMetadataToggle";
import { CatalogSyncSection } from "./CatalogSyncSection";
import { DangerZone } from "./DangerZone";
import { DefenderToggle } from "./DefenderToggle";
import { useDriveSelection } from "./useDriveSelection";

interface SettingsViewProps {
  defaultDrive: string;
  onDriveChange: (drive: string) => void;
  driveSelectionLocked?: boolean;
  isAdmin: boolean;
  catalogStats: CatalogStats | null;
  catalogGameCount: number;
  catalogSyncing: boolean;
  onCatalogRefresh: () => void;
  onShowGamesWithoutMetadataChange: (show: boolean) => void;
}

const GITHUB_REPO_URL = "https://github.com/kauafpssx/The-Gaming-Rumble/tree/main";

/** lucide-react não tem mais ícones de marca — logo do GitHub embutida como SVG. */
function GithubIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.35-3.88-1.35-.52-1.33-1.28-1.68-1.28-1.68-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.77.12 3.06.74.8 1.19 1.83 1.19 3.09 0 4.43-2.7 5.4-5.27 5.69.42.36.78 1.07.78 2.17 0 1.57-.01 2.83-.01 3.22 0 .3.2.66.79.55C20.71 21.38 24 17.07 24 12 24 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export function SettingsView({
  defaultDrive,
  onDriveChange,
  driveSelectionLocked = false,
  isAdmin,
  catalogStats,
  catalogGameCount,
  catalogSyncing,
  onCatalogRefresh,
  onShowGamesWithoutMetadataChange,
}: SettingsViewProps) {
  const { drives, loading, selectDrive } = useDriveSelection(onDriveChange, driveSelectionLocked);
  const [launcherVersion, setLauncherVersion] = useState("Detectando...");
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(() => readJson(SYSTEM_STATUS_CACHE_KEY));

  useEffect(() => {
    getVersion().then((v) => setLauncherVersion(`v${v}`)).catch(() => setLauncherVersion("Desconhecida"));
    getSystemStatus()
      .then((status) => {
        setSystemStatus(status);
        writeJson(SYSTEM_STATUS_CACHE_KEY, status);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex-1 overflow-y-auto w-full p-10 custom-scrollbar flex flex-col gap-6 uppercase font-bold tracking-tight">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-xl text-white/90 tracking-tighter">Configurações</h2>
          <p className="text-[9px] text-primary tracking-[0.4em] mt-1 opacity-80">Ajustes do Núcleo</p>
        </div>
        <Badge variant={isAdmin ? "success" : "destructive"}>
          {isAdmin ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
          {isAdmin ? "Privilégio Admin" : "Acesso Comum"}
        </Badge>
      </header>

      <section className="flex flex-col gap-4">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-slate-500 mb-1">UNIDADE DE DESTINO PADRÃO</p>
          <p className="text-[9px] text-slate-600 normal-case font-medium">
            Os jogos serão salvos em: <span className="text-primary font-mono">{defaultDrive}Gaming Rumble\</span>
          </p>
          {driveSelectionLocked && (
            <p className="mt-2 text-[9px] text-destructive tracking-[0.15em]">Troca de disco bloqueada enquanto houver download ou instalação em andamento.</p>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          {loading && <p className="text-[9px] text-slate-600 italic normal-case">Varrendo unidades...</p>}
          {drives.map((disk) => {
            const usedPct = disk.total_gb > 0 ? Math.min(((disk.total_gb - disk.free_gb) / disk.total_gb) * 100, 100) : 0;
            const isSelected = defaultDrive === disk.name;
            const displayLabel = disk.label && disk.label !== disk.name ? `${disk.label} (${disk.name})` : disk.name;

            return (
              <button
                key={disk.name}
                onClick={() => selectDrive(disk)}
                disabled={driveSelectionLocked}
                className={cn(
                  "flex items-center gap-5 p-5 rounded-2xl transition-all text-left cursor-pointer",
                  driveSelectionLocked && "opacity-55 cursor-not-allowed",
                  isSelected ? "bg-white/[0.03] border border-white/10" : "bg-white/[0.01] border border-transparent hover:bg-white/[0.04]"
                )}
              >
                <HardDrive size={24} className={isSelected ? "text-primary" : "text-slate-600"} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className={cn("text-sm tracking-tight", isSelected ? "text-white/90" : "text-slate-400")}>{displayLabel}</span>
                    <span className="text-[10px] font-mono text-slate-500">{disk.free_gb.toFixed(1)} GB de {disk.total_gb.toFixed(0)} GB</span>
                  </div>
                  <div className="w-full h-1.5 bg-background rounded-full overflow-hidden border border-white/5">
                    <div className={cn("h-full rounded-full transition-all duration-700", isSelected ? "bg-primary" : "bg-slate-700")} style={{ width: `${usedPct}%` }} />
                  </div>
                </div>
                {isSelected && <CheckCircle2 size={20} className="text-primary" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-white/[0.02] rounded-3xl p-6 border border-white/5 flex flex-col gap-2">
        <p className="text-[10px] tracking-[0.3em] text-slate-500 mb-2">INTEGRIDADE DO SISTEMA</p>
        <StatusRow label="Protocolo" value={systemStatus ? `${systemStatus.protocol} / ${systemStatus.protocolActive ? "ATIVO" : "INATIVO"}` : "..."} />
        <StatusRow label="Motor de Magnet" value={systemStatus?.aria2Version ?? "..."} />
        <StatusRow label="Motor de Extração" value={systemStatus?.sevenZipVersion ?? "..."} />
        <StatusRow label="Versão do Lançador" value={launcherVersion} last />
      </section>

      <DefenderToggle isAdmin={isAdmin} />

      <CatalogSyncSection stats={catalogStats} gameCount={catalogGameCount} syncing={catalogSyncing} onRefresh={onCatalogRefresh} />

      <CatalogMetadataToggle onChange={onShowGamesWithoutMetadataChange} />

      <section className="flex flex-col gap-3">
        <DangerZone defaultDrive={defaultDrive} locked={driveSelectionLocked} />
        <div className="flex justify-center pt-2">
          <button onClick={() => openUrl(GITHUB_REPO_URL).catch(() => {})} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-all hover:text-primary hover:bg-white/[0.03] cursor-pointer">
            <GithubIcon size={20} />
          </button>
        </div>
      </section>
    </div>
  );
}

function StatusRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={cn("flex justify-between items-center text-[10px] py-1", !last && "border-b border-white/5")}>
      <span className="text-slate-400">{label}</span>
      <span className="text-primary font-mono">{value}</span>
    </div>
  );
}
