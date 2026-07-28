import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useMemo,
  useCallback,
} from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { GameModal } from "./GameModal";
import {
  type Game,
  type SortId,
  type GameStats,
  toSlug,
  findBySlug,
  findByHash,
  sortGames,
  getUpdatesFeed,
  searchGames,
  encodeGameForDataUrl,
} from "@/lib/games";
import { FullScreenMessage } from "@/components/ui/full-screen-message";
import { CatalogHeader } from "@/components/game-catalog/catalog-header";
import { GameGrid } from "@/components/game-catalog/game-grid";
import { Pagination } from "@/components/game-catalog/pagination";
import { StatusFooter } from "@/components/game-catalog/status-footer";

// Re-export types consumed by GameModal
export type { Game };
export type { GameFile } from "@/lib/games";

const GAMES_PER_PAGE = 32;

export function GameCatalog() {
  const { page: pageParam, slug } = useParams<{ page?: string; slug?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isDownload = searchParams.has("download");

  /* ── Init page from URL so first render is correct ── */
  const [page, setPage] = useState<number>(() => {
    const p = pageParam ? parseInt(pageParam) : 1;
    return isNaN(p) || p < 1 ? 1 : p;
  });
  const [sort, setSort] = useState<SortId | null>("newest");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [headerH, setHeaderH] = useState(56);
  const [footerHidden, setFooterHidden] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);

  /* ── Fetch stats if available ── */
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const r = await fetch("/api/stats");
      if (!r.ok) return null;
      return (await r.json()) as GameStats;
    },
    staleTime: 1000 * 60 * 5,
  });

  /* ── Fetch games (cached via QueryClient) ── */
  const { data: gamesData, isLoading, isError } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const r = await fetch("/api/games");
      if (!r.ok) throw new Error("Failed to fetch games");
      return (await r.json()) as Game[];
    },
    staleTime: 1000 * 60 * 5,
  });
  const games = useMemo(() => gamesData ?? [], [gamesData]);

  /* ── Derived data — must come before effects that reference them ── */
  const processed = useMemo(() => {
    if (search.trim()) return searchGames(games, search);
    if (sort === "updates") return getUpdatesFeed(games, stats ?? null);
    return sortGames(games, sort);
  }, [games, search, sort, stats]);
  const totalPages = Math.ceil(processed.length / GAMES_PER_PAGE);
  const paginated = processed.slice((page - 1) * GAMES_PER_PAGE, page * GAMES_PER_PAGE);

  /* ── Sync page from URL; clamp to totalPages ── */
  useEffect(() => {
    if (!pageParam) return;
    const p = parseInt(pageParam);
    if (isNaN(p) || p < 1) {
      navigate("/page/1", { replace: true });
    } else if (totalPages > 0 && p > totalPages) {
      navigate(`/page/${totalPages}`, { replace: true });
    } else {
      setPage(p);
    }
  }, [pageParam, totalPages, navigate]);

  /* ── Handle /game/:slug?download → encode & redirect to deep-link ── */
  useEffect(() => {
    if (!isDownload || !slug || games.length === 0) return;
    const game = findByHash(games, slug) || findBySlug(games, slug);
    if (game) navigate(`/?data=${encodeGameForDataUrl(game)}`, { replace: true });
    else navigate("/page/1", { replace: true });
  }, [isDownload, slug, games, navigate]);

  /* ── Redirect from Hash to Slug for cleaner URLs (if not downloading) ── */
  useEffect(() => {
    if (isDownload || !slug || games.length === 0) return;
    const gameByHash = findByHash(games, slug);
    if (gameByHash && slug !== toSlug(gameByHash.title)) {
      navigate(`/game/${toSlug(gameByHash.title)}`, { replace: true });
    }
  }, [slug, isDownload, games, navigate]);

  /* ── Auto-open modal for /game/:slug (supports slug or hash) ── */
  useEffect(() => {
    if (!slug || isDownload || games.length === 0) return;
    const game = findByHash(games, slug) || findBySlug(games, slug);
    setSelectedGame(game ?? null);
  }, [slug, isDownload, games]);

  /* ── Scroll to top instantly on page change ── */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  /* ── Fixed header scroll detection ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Measure header height for spacer ── */
  useLayoutEffect(() => {
    if (!headerRef.current) return;
    const ro = new ResizeObserver(() => {
      setHeaderH(headerRef.current?.getBoundingClientRect().height ?? 56);
    });
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

  /* ── Focus search on open ── */
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  /* ── Hide footer when overlapping pagination ── */
  useEffect(() => {
    const handleScroll = () => {
      if (!paginationRef.current) {
        setFooterHidden(false);
        return;
      }
      const rect = paginationRef.current.getBoundingClientRect();
      // rect.top is the distance from viewport top to pagination top
      // If the top of pagination is near the bottom of viewport, hide footer
      const threshold = window.innerHeight - 60;
      setFooterHidden(rect.top < threshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Run once on mount to set initial state
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [paginated.length]); // Re-run if content changes

  /* ── Actions ── */
  const handleSearch = (v: string) => {
    setSearch(v);
    if (page !== 1) {
      setPage(1);
      navigate("/page/1");
    }
  };

  const handleSort = (id: SortId) => {
    setSort((prev) => (prev === id ? null : id));
    if (page !== 1) {
      setPage(1);
      navigate("/page/1");
    }
  };

  const changePage = (newPage: number) => {
    setPage(newPage);
    navigate(`/page/${newPage}`);
  };

  const openModal = useCallback(
    (game: Game) => {
      navigate(`/game/${toSlug(game.title)}`);
      setSelectedGame(game);
    },
    [navigate]
  );

  const closeModal = useCallback(() => {
    setSelectedGame(null);
    navigate(`/page/${page}`);
  }, [page, navigate]);

  const openRandom = useCallback(() => {
    if (games.length === 0) return;
    const game = games[Math.floor(Math.random() * games.length)];
    openModal(game);
  }, [games, openModal]);

  if (isLoading || (isDownload && slug)) {
    return (
      <FullScreenMessage
        spinner
        message={isDownload ? "Preparando download..." : "Carregando catálogo..."}
      />
    );
  }

  if (isError) {
    return (
      <FullScreenMessage
        message="Erro ao carregar o catálogo."
        action={{ label: "Tentar novamente", onClick: () => window.location.reload() }}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <CatalogHeader
        ref={headerRef}
        scrolled={scrolled}
        gamesCount={games.length}
        stats={stats ?? undefined}
        sort={sort}
        onSort={handleSort}
        onLogoClick={() => { setPage(1); navigate("/page/1"); }}
        search={search}
        searchOpen={searchOpen}
        searchRef={searchRef}
        onSearchChange={handleSearch}
        onSearchOpenChange={setSearchOpen}
      />

      {/* Spacer that matches header height */}
      <div aria-hidden style={{ height: headerH, transition: "height 300ms ease" }} />

      {/* ── Content ── */}
      <main className="p-4 md:p-8 w-full pb-24">
        <GameGrid
          games={paginated}
          stats={stats ?? undefined}
          gridKey={`${page}-${sort ?? "none"}-${search}`}
          onExpand={openModal}
        />
        <Pagination ref={paginationRef} page={page} totalPages={totalPages} onChange={changePage} />
      </main>

      {stats && <StatusFooter stats={stats} hidden={footerHidden} onRandom={openRandom} />}

      {selectedGame && (
        <GameModal game={selectedGame} onClose={closeModal} />
      )}
    </div>
  );
}
