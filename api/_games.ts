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

export interface SteamData {
  steam_appid: number;
  header_image: string;
  short_description: string;
  price_brl: string;
  is_free: boolean;
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
