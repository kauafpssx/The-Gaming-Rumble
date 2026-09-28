import type { RefObject } from "react";
import { Search, X } from "lucide-react";

import type { CatalogStats } from "@/domain/catalog";
import type { SortId } from "@/domain/catalog-sort";

import { SORT_OPTIONS } from "./sort-options";
import { SortPill } from "./SortPill";

interface CatalogHeaderProps {
  gamesCount: number;
  stats: CatalogStats | null;
  sort: SortId | null;
  onSort: (id: SortId) => void;
  search: string;
  searchOpen: boolean;
  searchRef: RefObject<HTMLInputElement | null>;
  onSearchChange: (value: string) => void;
  onSearchOpenChange: (open: boolean) => void;
}

export function CatalogHeader({ gamesCount, stats, sort, onSort, search, searchOpen, searchRef, onSearchChange, onSearchOpenChange }: CatalogHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-4 md:px-6 py-3 border-b border-white/5 bg-[#131315]/90 backdrop-blur-md shrink-0">
      <div className="flex flex-col shrink-0 pr-2">
        <span className="text-sm font-semibold leading-none whitespace-nowrap text-white">Catálogo</span>
        <span className="text-[10px] text-muted-foreground font-normal mt-0.5">
          {stats ? (
            <>
              {stats.totalGames.toLocaleString()} jogos | {stats.gamesWithProviders} diretos
            </>
          ) : (
            <>{gamesCount.toLocaleString()} jogos</>
          )}
        </span>
      </div>

      <div className="flex items-center justify-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0 py-0.5 px-2">
        {SORT_OPTIONS.map(({ id, label, Icon }) => (
          <SortPill key={id} active={sort === id} Icon={Icon} onClick={() => onSort(id)}>
            {label}
          </SortPill>
        ))}
      </div>

      <div className="flex items-center gap-1.5 shrink-0 relative">
        <div
          className="absolute right-full mr-2 top-1/2 -translate-y-1/2 overflow-hidden transition-all duration-300"
          style={{ width: searchOpen ? 200 : 0, opacity: searchOpen ? 1 : 0, pointerEvents: searchOpen ? "auto" : "none" }}
        >
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onBlur={() => { if (!search) onSearchOpenChange(false); }}
            onKeyDown={(e) => { if (e.key === "Escape") { onSearchChange(""); onSearchOpenChange(false); } }}
            placeholder="Buscar jogo..."
            className="w-[200px] px-3 py-1.5 rounded-lg bg-card border border-border text-sm outline-none"
          />
        </div>

        <button
          onClick={() => { if (search) { onSearchChange(""); onSearchOpenChange(false); } else onSearchOpenChange(true); }}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/70 transition-colors shrink-0 cursor-pointer"
        >
          {search ? <X className="w-4 h-4 text-muted-foreground" /> : <Search className="w-4 h-4 text-muted-foreground" />}
        </button>
      </div>
    </div>
  );
}
