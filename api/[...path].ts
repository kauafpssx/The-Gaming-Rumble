import type { IncomingMessage, ServerResponse } from "http";
import { parse } from "url";
import { fetchGames, fetchStats, sendJson, getJsonBody, createHandler } from "./_utils";
import {
  searchGames,
  sortGames,
  findBySlug,
  findByHash,
  encodeGameForDataUrl,
  makeProtocolUrl,
} from "../src/lib/games";

async function router(req: IncomingMessage, res: ServerResponse) {
  const url = parse(req.url || "", true);
  const pathname = url.pathname || "";
  const segs = pathname.replace(/^\/api\//, "").split("/").filter(Boolean);
  const [seg0, seg1, seg2] = segs;
  const q = url.query;
  const method = req.method;

  // GET /api/games
  // GET /api/games/:slug
  // GET /api/games/hash/:hash
  if (seg0 === "games") {
    if (!seg1) {
      const games = await fetchGames();
      return sendJson(res, 200, games);
    }
    if (seg1 === "hash") {
      const hash = seg2;
      if (!hash) return sendJson(res, 400, { error: "Missing hash" });
      const games = await fetchGames();
      const game = findByHash(games, hash);
      return game ? sendJson(res, 200, game) : sendJson(res, 404, { error: "Game not found" });
    }
    const games = await fetchGames();
    const game = findBySlug(games, seg1);
    return game ? sendJson(res, 200, game) : sendJson(res, 404, { error: "Game not found" });
  }

  // GET /api/search?q=
  if (seg0 === "search") {
    const qStr = ((q.q as string) || "").trim();
    const games = await fetchGames();
    if (!qStr) return sendJson(res, 200, games);
    const results = searchGames(games, qStr);
    const lowerQ = qStr.toLowerCase();
    const extra = games.filter((g) => {
      if (results.some((r) => r.unique_hash === g.unique_hash)) return false;
      if (g.unique_hash.toLowerCase().includes(lowerQ)) return true;
      if (g.hoster_links && Object.keys(g.hoster_links).some((p) => p.toLowerCase().includes(lowerQ))) return true;
      if (g.steam?.genres?.some((genre) => genre.description.toLowerCase().includes(lowerQ))) return true;
      if (g.steam?.categories?.some((cat) => cat.description.toLowerCase().includes(lowerQ))) return true;
      return false;
    });
    return sendJson(res, 200, [...results, ...extra]);
  }

  // GET /api/stats
  if (seg0 === "stats") {
    const stats = await fetchStats();
    return stats ? sendJson(res, 200, stats) : sendJson(res, 500, { error: "Stats not available" });
  }

  // GET /api/health
  if (seg0 === "health") {
    const start = Date.now();
    const games = await fetchGames();
    return sendJson(res, 200, {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      database: { connected: true, gamesCount: games.length, latencyMs: Date.now() - start },
    });
  }

  // GET /api/manifest
  if (seg0 === "manifest") {
    return sendJson(res, 200, {
      name: "Gaming Rumble Ecosystem",
      version: "1.0.0",
      protocol: "gaming-rumble",
      supported_clients: { windows: ">=1.0.0" },
      auth: { type: "api-key", header: "X-Api-Key", public_limit: "60 req/min", key_limit: "300 req/min" },
      endpoints: {
        games: "/api/games",
        search: "/api/search",
        stats: "/api/stats",
        trending: "/api/trending",
        recent: "/api/recent",
        updated: "/api/updated",
        providers: "/api/providers",
        health: "/api/health",
        manifest: "/api/manifest",
        download: "/api/download/:slug",
        encode_get: "/api/encode/:hashOrSlug",
        encode_post: "/api/encode",
        short_link: "/api/d/:id",
      },
    });
  }

  // GET /api/trending
  if (seg0 === "trending") {
    const games = await fetchGames();
    return sendJson(res, 200, sortGames(games, "newest").slice(0, 12));
  }

  // GET /api/recent
  if (seg0 === "recent") {
    const [games, stats] = await Promise.all([fetchGames(), fetchStats()]);
    let result = games.filter((g) => stats?.latest_run_new_game_names?.includes(g.title));
    if (result.length === 0) result = sortGames(games, "newest").slice(0, 24);
    return sendJson(res, 200, result);
  }

  // GET /api/updated
  if (seg0 === "updated") {
    const [games, stats] = await Promise.all([fetchGames(), fetchStats()]);
    let result = games.filter((g) => stats?.latest_run_updated_game_names?.includes(g.title));
    if (result.length === 0) {
      const withUpdates = games.filter((g) => g.update_date || g.last_update);
      result = sortGames(withUpdates, "newest").slice(0, 24);
    }
    return sendJson(res, 200, result);
  }

  // GET /api/providers
  if (seg0 === "providers") {
    const games = await fetchGames();
    const providers = new Set<string>(["torrent"]);
    games.forEach((g) => {
      if (g.hoster_links) Object.keys(g.hoster_links).forEach((p) => providers.add(p.toLowerCase()));
    });
    return sendJson(res, 200, Array.from(providers));
  }

  // GET /api/download/:slug
  if (seg0 === "download") {
    if (!seg1) return sendJson(res, 400, { error: "Missing slug" });
    const games = await fetchGames();
    const game = findByHash(games, seg1) || findBySlug(games, seg1);
    if (!game) return sendJson(res, 404, { error: "Game not found" });
    const protocolUrl = makeProtocolUrl(game);
    const dataPayload = encodeGameForDataUrl(game);
    return sendJson(res, 200, {
      title: game.title,
      unique_hash: game.unique_hash,
      protocolUrl,
      deepLinkUrl: `/?data=${dataPayload}`,
      dataPayload,
    });
  }

  // GET /api/d/:id
  if (seg0 === "d") {
    if (!seg1) return sendJson(res, 400, { error: "Missing ID" });
    const games = await fetchGames();
    const game = findByHash(games, seg1) || findBySlug(games, seg1);
    return game ? sendJson(res, 200, game) : sendJson(res, 404, { error: "Game not found" });
  }

  // GET /api/encode/:hashOrSlug
  // POST /api/encode
  if (seg0 === "encode") {
    if (seg1) {
      const games = await fetchGames();
      const game = findByHash(games, seg1) || findBySlug(games, seg1);
      if (!game) return sendJson(res, 404, { error: "Game not found" });
      return sendJson(res, 200, {
        title: game.title,
        unique_hash: game.unique_hash,
        protocolUrl: makeProtocolUrl(game),
      });
    }
    if (method !== "POST") return sendJson(res, 405, { error: "Method not allowed. Use POST /api/encode" });
    const body = (await getJsonBody(req)) as Record<string, unknown>;
    const game = body?.game as Record<string, unknown> | undefined;
    if (!game?.title || !game?.magnet) {
      return sendJson(res, 400, { error: "Invalid payload", hint: "Body must include game.title and game.magnet." });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = game as unknown as any;
    return sendJson(res, 200, {
      encoded: encodeGameForDataUrl(g),
      deepLinkUrl: `/?data=${encodeGameForDataUrl(g)}`,
      protocolUrl: makeProtocolUrl(g),
    });
  }

  return sendJson(res, 404, { error: "API endpoint not found" });
}

export default createHandler(router, { methods: ["GET", "POST"] });
