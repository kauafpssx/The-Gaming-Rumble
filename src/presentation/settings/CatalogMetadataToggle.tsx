import { useState } from "react";

import { SHOW_GAMES_WITHOUT_STEAM_METADATA_KEY } from "@/infrastructure/storage/keys";
import { readString, writeString } from "@/infrastructure/storage/local-storage";
import { Switch } from "@/components/ui/switch";

interface CatalogMetadataToggleProps {
  onChange: (showWithoutMetadata: boolean) => void;
}

export function CatalogMetadataToggle({ onChange }: CatalogMetadataToggleProps) {
  const [enabled, setEnabled] = useState(() => readString(SHOW_GAMES_WITHOUT_STEAM_METADATA_KEY) === "true");

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    writeString(SHOW_GAMES_WITHOUT_STEAM_METADATA_KEY, String(next));
    onChange(next);
  }

  return (
    <section className="bg-white/[0.02] rounded-3xl p-6 border border-white/5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.3em] text-slate-500 mb-2">CATÁLOGO</p>
          <h3 className="text-sm text-white/90 tracking-tight">Mostrar jogos sem metadados Steam</h3>
          <p className="mt-2 text-[9px] text-slate-500 normal-case font-medium leading-5">
            Quando desativado (padrão), o catálogo só lista jogos com capa, descrição e outros dados vindos da Steam.
          </p>
        </div>

        <Switch checked={enabled} onCheckedChange={handleToggle} />
      </div>
    </section>
  );
}
