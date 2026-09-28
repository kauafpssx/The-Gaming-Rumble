import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, SearchX } from "lucide-react";

import type { CatalogEntry, CatalogStats } from "@/domain/catalog";
import { getUpdatesFeed, searchGames, sortGames, type SortId } from "@/domain/catalog-sort";
import { Button } from "@/components/ui/button";

import { CatalogCard, CatalogCardSkeleton } from "./CatalogCard";
import { CatalogHeader } from "./CatalogHeader";
import { CatalogPagination } from "./CatalogPagination";
import { useGridColumns } from "./useGridColumns";

/** Linhas por página — o total real de jogos/página é `colunas atuais * ROWS_PER_PAGE`, então a
 * última linha nunca fica incompleta, em qualquer largura de janela. */
const ROWS_PER_PAGE = 6;
const FALLBACK_GAMES_PER_PAGE = 30;

const GRID_CLASSNAME = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 md:gap-4";

interface CatalogViewProps {
  games: CatalogEntry[];
  stats: CatalogStats | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  installedTitles: Set<string>;
  onOpenGame: (game: CatalogEntry) => void;
  onPlayInstalled: (game: CatalogEntry) => void;
  onRefresh: () => void;
}

export function CatalogView({ games, stats, loading, syncing, error, installedTitles, onOpenGame, onPlayInstalled, onRefresh }: CatalogViewProps) {
  const [sort, setSort] = useState<SortId | null>("newest");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [page, setPage] = useState(1);
  const searchRef = useRef<HTMLInputElement>(null);
  const { ref: gridRef, columns } = useGridColumns<HTMLDivElement>();

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const processed = useMemo(() => {
    if (search.trim()) return searchGames(games, search);
    if (sort === "updates") return getUpdatesFeed(games, stats);
    return sortGames(games, sort);
  }, [games, search, sort, stats]);

  useEffect(() => {
    setPage(1);
  }, [search, sort]);

  const gamesPerPage = columns > 0 ? columns * ROWS_PER_PAGE : FALLBACK_GAMES_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(processed.length / gamesPerPage));
  const paginated = processed.slice((page - 1) * gamesPerPage, page * gamesPerPage);

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  function handleSort(id: SortId) {
    setSort((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <CatalogHeader
        gamesCount={games.length}
        stats={stats}
        sort={sort}
        onSort={handleSort}
        search={search}
        searchOpen={searchOpen}
        searchRef={searchRef}
        onSearchChange={setSearch}
        onSearchOpenChange={setSearchOpen}
      />

      <div className="flex-1 overflow-y-auto w-full p-4 md:p-6 custom-scrollbar flex flex-col gap-4">
        {syncing && (
          <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.3em] text-slate-600 px-1">
            <RefreshCw size={10} className="animate-spin" /> Sincronizando catálogo
          </span>
        )}

        {loading ? (
          <div ref={gridRef} className={GRID_CLASSNAME}>
            {Array.from({ length: FALLBACK_GAMES_PER_PAGE }).map((_, i) => <CatalogCardSkeleton key={i} />)}
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
            <SearchX size={40} className="text-slate-600" />
            <span className="text-sm text-slate-500 tracking-widest uppercase">{error ? "Falha ao carregar o catálogo" : "Nenhum jogo encontrado"}</span>
            {error && <span className="max-w-md text-center text-[10px] normal-case text-slate-600">{error}</span>}
            <Button variant="outline" size="sm" disabled={syncing} onClick={onRefresh}>
              <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Buscando..." : "Buscar agora"}
            </Button>
          </div>
        ) : (
          <div ref={gridRef} key={`${page}-${sort ?? "none"}-${search}`} className={GRID_CLASSNAME}>
            {paginated.map((game) => {
              const isNew = stats?.latestRunNewGameNames.includes(game.title);
              const isUpd = stats?.latestRunUpdatedGameNames.includes(game.title);
              return (
                <CatalogCard
                  key={game.id}
                  game={game}
                  installed={installedTitles.has(game.title.trim().toLowerCase())}
                  status={isNew ? "new" : isUpd ? "upd" : undefined}
                  onExpand={onOpenGame}
                  onPlayInstalled={onPlayInstalled}
                />
              );
            })}
          </div>
        )}
      </div>

      {!loading && paginated.length > 0 && (
        <div className="shrink-0 border-t border-white/5 bg-[#131315]/90 backdrop-blur-md py-3">
          <CatalogPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
