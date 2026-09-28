import { useState } from "react";

import { deleteAllGames } from "@/infrastructure/tauri/commands";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface DangerZoneProps {
  defaultDrive: string;
  locked: boolean;
}

export function DangerZone({ defaultDrive, locked }: DangerZoneProps) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [busy, setBusy] = useState(false);

  async function handleDeleteAll() {
    if (locked || busy) return;
    setBusy(true);
    try {
      await deleteAllGames(defaultDrive);
      setStep(0);
    } catch (error) {
      console.warn("[LIBRARY] Failed to delete all games:", error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="destructive" className="w-full" disabled={locked || busy} onClick={() => setStep(1)}>
        Deletar todos os jogos
      </Button>

      <Dialog open={step > 0} onOpenChange={(open) => !open && setStep(0)}>
        <DialogContent showClose={false} className="w-[min(480px,92vw)]">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-destructive">Ação crítica</p>
          <DialogTitle className="mt-3">{step === 1 ? "Tem certeza?" : "Tem certeza mesmo?"}</DialogTitle>
          <DialogDescription className="mt-3">
            {step === 1
              ? `Isso vai apagar todos os jogos instalados em ${defaultDrive}Gaming Rumble e limpar a biblioteca dessa unidade.`
              : "Essa ação remove pastas dos jogos e não pode ser desfeita."}
          </DialogDescription>

          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" disabled={busy} onClick={() => setStep(0)}>
              Não
            </Button>
            {step === 1 ? (
              <Button variant="destructive" className="flex-1" disabled={busy} onClick={() => setStep(2)}>
                Sim
              </Button>
            ) : (
              <Button variant="destructive" className="flex-1" disabled={busy} onClick={handleDeleteAll}>
                {busy ? "Apagando..." : "Sim, apagar tudo"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
