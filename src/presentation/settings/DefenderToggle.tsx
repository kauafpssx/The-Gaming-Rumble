import { useEffect, useState } from "react";

import { getDefenderStatus, setDefenderRealtimeMonitoring } from "@/infrastructure/tauri/commands";
import { DISABLE_DEFENDER_ON_START_KEY } from "@/infrastructure/storage/keys";
import { readString, writeString } from "@/infrastructure/storage/local-storage";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";

interface DefenderToggleProps {
  isAdmin: boolean;
}

export function DefenderToggle({ isAdmin }: DefenderToggleProps) {
  const [enabled, setEnabled] = useState(() => readString(DISABLE_DEFENDER_ON_START_KEY) !== "false");
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getDefenderStatus()
      .then((status) => {
        setAvailable(status.available);
        if (!status.available) {
          setEnabled(false);
          writeString(DISABLE_DEFENDER_ON_START_KEY, "false");
        }
      })
      .catch(() => {
        setAvailable(false);
        setEnabled(false);
        writeString(DISABLE_DEFENDER_ON_START_KEY, "false");
      });
  }, []);

  async function handleToggle() {
    if (!available || busy) return;
    const next = !enabled;
    setEnabled(next);
    writeString(DISABLE_DEFENDER_ON_START_KEY, String(next));
    setBusy(true);
    try {
      await setDefenderRealtimeMonitoring(next);
    } catch (error) {
      console.warn("[DEFENDER] Failed to update realtime monitoring:", error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white/[0.02] rounded-3xl p-6 border border-white/5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.3em] text-slate-500 mb-2">WINDOWS DEFENDER</p>
          <h3 className="text-sm text-white/90 tracking-tight">Desabilitar ao iniciar o aplicativo</h3>
          <p className="mt-2 text-[9px] text-slate-500 normal-case font-medium leading-5">
            Aplica <span className="font-mono text-primary">Set-MpPreference -DisableRealtimeMonitoring</span> automaticamente.
          </p>
          {!available && (
            <p className="mt-2 text-[9px] text-slate-500 normal-case font-medium">
              Microsoft Defender indisponível neste sistema. A opção fica bloqueada automaticamente.
            </p>
          )}
          {!isAdmin && (
            <p className="mt-2 text-[9px] text-destructive normal-case font-medium">
              Requer execução como administrador para surtir efeito no Windows Defender.
            </p>
          )}
        </div>

        <Tooltip content="Alternar desativacao automatica do Defender" disabled={!available}>
          <div>
            <Switch checked={enabled && available} onCheckedChange={handleToggle} disabled={busy || !available} />
          </div>
        </Tooltip>
      </div>
    </section>
  );
}
