import { forwardRef, type RefObject } from "react";
import { Search, X } from "lucide-react";
import icon from "@/assets/icon.png";
import { type SortId, type GameStats } from "@/lib/games";
import { SortPill } from "./sort-pill";
import { SORT_OPTIONS } from "./sort-options";

export const CatalogHeader = forwardRef<HTMLElement, {
  scrolled: boolean;
  gamesCount: number;
  stats: GameStats | undefined;
  sort: SortId | null;
  onSort: (id: SortId) => void;
  onLogoClick: () => void;
  search: string;
  searchOpen: boolean;
  searchRef: RefObject<HTMLInputElement>;
  onSearchChange: (value: string) => void;
  onSearchOpenChange: (open: boolean) => void;
}>(function CatalogHeader(
  {
    scrolled,
    gamesCount,
    stats,
    sort,
    onSort,
    onLogoClick,
    search,
    searchOpen,
    searchRef,
    onSearchChange,
    onSearchOpenChange,
  },
  ref
) {
  return (
    <header ref={ref} className="fixed top-0 left-0 right-0 z-40 px-3 pt-3 pb-1.5">
      <div
        className={`flex items-center gap-2 px-3 rounded-2xl border border-border bg-card/90 backdrop-blur-md transition-all duration-300 ${
          scrolled ? "py-2 shadow-2xl shadow-black/50" : "py-2.5 shadow-xl shadow-black/25"
        }`}
      >
        {/* Logo + title */}
        <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={onLogoClick}>
          <img
            src={icon}
            alt="GR"
            className={`rounded-xl shrink-0 transition-all duration-300 ${scrolled ? "w-7 h-7" : "w-8 h-8"}`}
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none whitespace-nowrap">
              Gaming Rumble
            </span>
            <span className="text-[10px] text-muted-foreground font-normal mt-0.5">
              {stats ? (
                <>{stats.total_games.toLocaleString()} jogos | {stats.games_with_providers} diretos</>
              ) : (
                <>{gamesCount.toLocaleString()} jogos</>
              )}
            </span>
          </div>
        </div>

        {/* Sort pills — horizontally scrollable, centered */}
        <div className="flex items-center justify-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0 py-0.5 px-2">
          {SORT_OPTIONS.map(({ id, label, Icon }) => (
            <SortPill key={id} active={sort === id} Icon={Icon} onClick={() => onSort(id)}>
              {label}
            </SortPill>
          ))}
        </div>

        {/* Right: count + search icon — pills never move */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          {/* Input absolutely positioned: expands left over pills, doesn't shift layout */}
          <div
            className="absolute right-full mr-2 top-1/2 -translate-y-1/2 overflow-hidden transition-all duration-300"
            style={{
              width: searchOpen ? 200 : 0,
              opacity: searchOpen ? 1 : 0,
              pointerEvents: searchOpen ? "auto" : "none",
            }}
          >
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              onBlur={() => { if (!search) onSearchOpenChange(false); }}
              onKeyDown={(e) => {
                if (e.key === "Escape") { onSearchChange(""); onSearchOpenChange(false); }
              }}
              placeholder="Buscar jogo..."
              className="w-[200px] px-3 py-1.5 rounded-lg bg-card border border-border text-sm outline-none"
            />
          </div>

          <button
            onClick={() => {
              if (search) { onSearchChange(""); onSearchOpenChange(false); }
              else onSearchOpenChange(true);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/70 transition-colors shrink-0"
          >
            {search ? (
              <X className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Search className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
});
