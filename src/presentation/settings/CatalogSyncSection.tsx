import { RefreshCw } from "lucide-react";

import type { CatalogStats } from "@/domain/catalog";
import { Button } from "@/components/ui/button";

interface CatalogSyncSectionProps {
  stats: CatalogStats | null;
  gameCount: number;
  syncing: boolean;
  onRefresh: () => void;
}

export function CatalogSyncSection({ stats, gameCount, syncing, onRefresh }: CatalogSyncSectionProps) {
  return (
    <section className="bg-white/[0.02] rounded-3xl p-6 border border-white/5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.3em] text-slate-500 mb-2">CATÁLOGO DE JOGOS</p>
          <h3 className="text-sm text-white/90 tracking-tight">
            {gameCount} jogos disponíveis
          </h3>
          <p className="mt-2 text-[9px] text-slate-500 normal-case font-medium">
            {stats ? `Atualizado em ${stats.generatedAtDisplay}` : "Ainda não sincronizado nesta sessão."}
          </p>
        </div>

        <Button variant="outline" size="sm" disabled={syncing} onClick={onRefresh} className="shrink-0">
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Atualizando..." : "Atualizar catálogo"}
        </Button>
      </div>
    </section>
  );
}
