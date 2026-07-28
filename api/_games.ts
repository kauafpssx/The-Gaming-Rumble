import { deflateSync } from "zlib";

export interface GameStats {
  total_games: number;
  online_fix_total: number;
  steam_with_metadata: number;
  steam_without_metadata: number;
  match_rate: number;
  success_rate: number;
  games_with_providers: number;
  last_scrape_at: string;
  last_scrape_at_display: string;
  generated_at: string;
  generated_at_display: string;
  latest_run_new_game_names: string[];
  latest_run_updated_game_names: string[];
}

export interface GameFile {
  name: string;
  size: string;
}

export interface HosterLink {
  file_name?: string;
  direct_link?: string;
  n?: string;
  u?: string;
}

export interface SteamMovie {
  thumbnail: string;
  dash_h264?: string;
  hls_h264?: string;
}

export interface SteamData {
  steam_appid: number;
  header_image: string;
  capsule_imagev5?: string;
  background_raw?: string;
  screenshots?: string[];
  movies?: SteamMovie[];
  achievements_total?: number;
  achievements_highlighted?: { name: string; path: string }[];
  ratings?: { pegi: string | null; esrb: string | null };
  release_date_steam?: string | null;
  short_description: string;
  short_description_native?: string;
  price_brl: string;
  is_free: boolean;
  pc_requirements?: { minimum: string | null; recommended: string | null };
  controller_support?: string | null;
  genres?: { id: string | number; description: string }[];
  categories?: { id: number; description: string }[];
}

export interface Game {
  title: string;
  page: number;
  url: string;
  last_update: string | null;
  release_date: string | null;
  update_date: string | null;
  created_at: string | null;
  fileSize: string;
  magnet: string;
  torrent_file: string;
  unique_hash: string;
  files: GameFile[];
  comment: string;
  steam: SteamData;
  hoster_links?: Record<string, HosterLink[]>;
}

export type SortId = "az" | "za" | "newest" | "oldest" | "largest" | "smallest";

export function toSlug(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function findBySlug(games: Game[], slug: string): Game | null {
  return games.find((g) => toSlug(g.title) === slug) ?? null;
}

export function findByHash(games: Game[], hash: string): Game | null {
  const h = hash.toLowerCase();
  return games.find((g) => g.unique_hash.toLowerCase().startsWith(h)) ?? null;
}

export function makeProtocolUrl(game: Game): string {
  const h: Record<string, { n: string; u: string }[]> = {};
  if (game.hoster_links) {
    for (const [provider, links] of Object.entries(game.hoster_links)) {
      h[provider] = links.map((l) => ({ n: l.file_name || l.n || "", u: l.direct_link || l.u || "" }));
    }
  }
  const payload = {
    title: game.title,
    banner: game.steam?.header_image ?? "",
    parts: game.files?.length ?? 1,
    fileSize: game.fileSize,
    magnet: game.magnet,
    hash: game.unique_hash,
    h: Object.keys(h).length > 0 ? h : undefined,
  };
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString("base64");
  return `gaming-rumble://${b64}`;
}

export function encodeGameForDataUrl(game: Game): string {
  const payload = {
    t: game.title,
    b: game.steam?.header_image ?? "",
    p: game.files?.length ?? 1,
    s: game.fileSize,
    m: game.magnet,
  };
  const bytes = Buffer.from(JSON.stringify(payload));
  const compressed = deflateSync(bytes);
  const b64 = Buffer.from(compressed).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

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

function bestTimestamp(game: Game): number {
  return parseAnyDate(game.update_date) || parseAnyDate(game.last_update) || parseAnyDate(game.created_at);
}

export function sortGames(games: Game[], sort: SortId | null): Game[] {
  if (!sort) return games;
  const arr = [...games];
  switch (sort) {
    case "az":       return arr.sort((a, b) => a.title.localeCompare(b.title));
    case "za":       return arr.sort((a, b) => b.title.localeCompare(a.title));
    case "newest":   return arr.sort((a, b) => bestTimestamp(b) - bestTimestamp(a));
    case "oldest":   return arr.sort((a, b) => bestTimestamp(a) - bestTimestamp(b));
    case "largest":  return arr.sort((a, b) => parseSizeToBytes(b.fileSize) - parseSizeToBytes(a.fileSize));
    case "smallest": return arr.sort((a, b) => parseSizeToBytes(a.fileSize) - parseSizeToBytes(b.fileSize));
  }
}

/* ── Recent / updated feeds (shared by /api/recent, /api/updated, /api/games?feed=) ── */

export function getNewGames(games: Game[], stats: GameStats | null, limit = 24): Game[] {
  const named = games.filter((g) => stats?.latest_run_new_game_names?.includes(g.title));
  if (named.length > 0) return named;
  return sortGames(games, "newest").slice(0, limit);
}

export function getUpdatedGames(games: Game[], stats: GameStats | null, limit = 24): Game[] {
  const named = games.filter((g) => stats?.latest_run_updated_game_names?.includes(g.title));
  if (named.length > 0) return named;
  const withUpdates = games.filter((g) => g.update_date || g.last_update);
  return sortGames(withUpdates, "newest").slice(0, limit);
}

/* ── Genres / categories / providers listings ── */

export function listGenres(games: Game[]): { id: string | number; description: string; count: number }[] {
  const map = new Map<string, { id: string | number; description: string; count: number }>();
  for (const g of games) {
    for (const genre of g.steam?.genres ?? []) {
      const key = String(genre.id);
      const existing = map.get(key);
      if (existing) existing.count++;
      else map.set(key, { id: genre.id, description: genre.description, count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export function listCategories(games: Game[]): { id: number; description: string; count: number }[] {
  const map = new Map<number, { id: number; description: string; count: number }>();
  for (const g of games) {
    for (const cat of g.steam?.categories ?? []) {
      const existing = map.get(cat.id);
      if (existing) existing.count++;
      else map.set(cat.id, { id: cat.id, description: cat.description, count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

/* ── Filtering ── */

export function filterByProvider(games: Game[], provider: string): Game[] {
  const p = provider.toLowerCase();
  if (p === "torrent") return games;
  return games.filter((g) => g.hoster_links && Object.keys(g.hoster_links).some((k) => k.toLowerCase() === p));
}

export function filterByGenre(games: Game[], genre: string): Game[] {
  const g = genre.toLowerCase();
  return games.filter((game) => game.steam?.genres?.some((x) => x.description.toLowerCase() === g));
}

export function filterByCategory(games: Game[], category: string): Game[] {
  const c = category.toLowerCase();
  return games.filter((game) => game.steam?.categories?.some((x) => x.description.toLowerCase() === c));
}

/* ── Similar games (by shared genres) ── */

export function findSimilar(games: Game[], game: Game, limit = 12): Game[] {
  const genreIds = new Set((game.steam?.genres ?? []).map((g) => String(g.id)));
  if (genreIds.size === 0) return [];
  return games
    .filter((g) => g.unique_hash !== game.unique_hash)
    .map((g) => ({ g, score: (g.steam?.genres ?? []).filter((x) => genreIds.has(String(x.id))).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.g);
}

/* ── Pagination ── */

export function paginate<T>(items: T[], page: number, limit: number) {
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const safePage = Math.max(1, page);
  const totalPages = Math.max(1, Math.ceil(items.length / safeLimit));
  const clampedPage = Math.min(safePage, totalPages);
  const start = (clampedPage - 1) * safeLimit;
  return {
    data: items.slice(start, start + safeLimit),
    page: clampedPage,
    limit: safeLimit,
    total: items.length,
    totalPages,
  };
}

export function searchGames(games: Game[], query: string): Game[] {
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
