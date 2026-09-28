import type { CatalogEntry, CatalogStats } from "./catalog";

export type SortId = "az" | "za" | "newest" | "oldest" | "largest" | "smallest" | "updates";

function parseSizeToBytes(size: string): number {
  const m = size.match(/([\d.]+)\s*(TB|GB|MB|KB)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  switch (m[2].toUpperCase()) {
    case "TB": return n * 1e12;
    case "GB": return n * 1e9;
    case "MB": return n * 1e6;
    case "KB": return n * 1e3;
    default: return n;
  }
}

function parseAnyDate(raw: string | null | undefined): number {
  if (!raw) return 0;
  const t = new Date(raw.replace(" ", "T")).getTime();
  return isNaN(t) ? 0 : t;
}

function bestTimestamp(game: CatalogEntry): number {
  return parseAnyDate(game.updateDate) || parseAnyDate(game.lastUpdate) || parseAnyDate(game.createdAt);
}

export function getGameDate(game: CatalogEntry): string | null {
  const ts = bestTimestamp(game);
  if (!ts) return null;
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function sortGames(games: CatalogEntry[], sort: SortId | null): CatalogEntry[] {
  if (!sort) return games;
  const arr = [...games];
  switch (sort) {
    case "az": return arr.sort((a, b) => a.title.localeCompare(b.title));
    case "za": return arr.sort((a, b) => b.title.localeCompare(a.title));
    case "newest": return arr.sort((a, b) => bestTimestamp(b) - bestTimestamp(a));
    case "oldest": return arr.sort((a, b) => bestTimestamp(a) - bestTimestamp(b));
    case "largest": return arr.sort((a, b) => parseSizeToBytes(b.fileSize) - parseSizeToBytes(a.fileSize));
    case "smallest": return arr.sort((a, b) => parseSizeToBytes(a.fileSize) - parseSizeToBytes(b.fileSize));
    case "updates": return arr.sort((a, b) => bestTimestamp(b) - bestTimestamp(a));
  }
}

/** Added games first, then edited, each newest-first; falls back to "newest" when the run had no changes. */
export function getUpdatesFeed(games: CatalogEntry[], stats: CatalogStats | null): CatalogEntry[] {
  const newNames = new Set(stats?.latestRunNewGameNames ?? []);
  const updatedNames = new Set(stats?.latestRunUpdatedGameNames ?? []);

  const added = games.filter((g) => newNames.has(g.title));
  const edited = games.filter((g) => !newNames.has(g.title) && updatedNames.has(g.title));

  if (added.length === 0 && edited.length === 0) return sortGames(games, "newest");

  const byNewest = (a: CatalogEntry, b: CatalogEntry) => bestTimestamp(b) - bestTimestamp(a);
  return [...added.sort(byNewest), ...edited.sort(byNewest)];
}

/** Relevance-ranked search: exact > startsWith > whole-word > word-startsWith > substring. */
export function searchGames(games: CatalogEntry[], query: string): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return games;

  const rank = (title: string): number => {
    const t = title.toLowerCase();
    if (t === q) return 0;
    if (t.startsWith(q)) return 1;
    const words = t.split(/[\s:_()-]+/);
    if (words.some((w) => w === q)) return 2;
    if (words.some((w) => w.startsWith(q))) return 3;
    return 4;
  };

  return games.filter((g) => g.title.toLowerCase().includes(q)).sort((a, b) => rank(a.title) - rank(b.title));
}
