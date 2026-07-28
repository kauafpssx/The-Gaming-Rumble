import type { IncomingMessage, ServerResponse } from "http";
import { parse } from "url";
import { fetchGames, fetchStats, sendJson, getJsonBody, createHandler, proxyImage, proxyMedia, resolveMediaToken } from "./_utils";
import {
  searchGames,
  sortGames,
  findBySlug,
  findByHash,
  encodeGameForDataUrl,
  makeProtocolUrl,
  toSlug,
  getNewGames,
  getUpdatedGames,
  listGenres,
  listCategories,
  filterByProvider,
  filterByGenre,
  filterByCategory,
  findSimilar,
  paginate,
  type Game,
} from "./_games";

function gameMedia(game: Game) {
  const slug = toSlug(game.title);
  const images: { type: string; index?: number; url: string }[] = [];

  if (game.steam?.header_image) images.push({ type: "header", url: `/api/image/${slug}` });
  (game.steam?.screenshots ?? []).forEach((_, i) =>
    images.push({ type: "screenshot", index: i, url: `/api/image/${slug}/screenshot/${i}` })
  );
  (game.steam?.achievements_highlighted ?? []).forEach((_, i) =>
    images.push({ type: "achievement", index: i, url: `/api/image/${slug}/achievement/${i}` })
  );

  const videos = (game.steam?.movies ?? [])
    .map((mv, i) => ({
      index: i,
      video: mv.hls_h264 || mv.dash_h264 ? `/api/video/${slug}/${i}` : null,
      thumbnail: mv.thumbnail ? `/api/image/${slug}/movie/${i}` : null,
    }))
    .filter((v) => v.video);

  return { images, videos };
}

async function router(req: IncomingMessage, res: ServerResponse) {
  const url = parse(req.url || "", true);
  const pathname = url.pathname || "";
  const segs = pathname.replace(/^\/api\//, "").split("/").filter(Boolean);
  const [seg0, seg1, seg2, seg3] = segs;
  const q = url.query;
  const method = req.method;

  // GET /api/games                          (?provider=&genre=&category=&page=&limit=)
  // GET /api/games/:slug
  // GET /api/games/hash/:hash
  // GET /api/games/:slug/media               (all image + video proxy URLs)
  // GET /api/games/:slug/images              (only images)
  // GET /api/games/:slug/videos              (only videos)
  // GET /api/games/:slug/similar             (?limit=, other games sharing genres)
  if (seg0 === "games") {
    if (!seg1) {
      let games = await fetchGames();
      if (q.provider) games = filterByProvider(games, q.provider as string);
      if (q.genre) games = filterByGenre(games, q.genre as string);
      if (q.category) games = filterByCategory(games, q.category as string);

      if (q.page || q.limit) {
        return sendJson(res, 200, paginate(games, Number(q.page) || 1, Number(q.limit) || 60));
      }
      return sendJson(res, 200, games);
    }
    if (seg1 === "hash") {
      const hash = seg2;
      if (!hash) return sendJson(res, 400, { error: "Missing hash" });
      const games = await fetchGames();
      const game = findByHash(games, hash);
      return game ? sendJson(res, 200, game) : sendJson(res, 404, { error: "Game not found" });
    }
    if (seg2 === "media" || seg2 === "images" || seg2 === "videos") {
      const games = await fetchGames();
      const game = findBySlug(games, seg1) || findByHash(games, seg1);
      if (!game) return sendJson(res, 404, { error: "Game not found" });
      const { images, videos } = gameMedia(game);
      if (seg2 === "images") return sendJson(res, 200, images);
      if (seg2 === "videos") return sendJson(res, 200, videos);
      return sendJson(res, 200, { images, videos });
    }
    if (seg2 === "similar") {
      const games = await fetchGames();
      const game = findBySlug(games, seg1) || findByHash(games, seg1);
      if (!game) return sendJson(res, 404, { error: "Game not found" });
      return sendJson(res, 200, findSimilar(games, game, Number(q.limit) || 12));
    }
    const games = await fetchGames();
    const game = findBySlug(games, seg1);
    return game ? sendJson(res, 200, game) : sendJson(res, 404, { error: "Game not found" });
  }

  // GET /api/random                          (?provider=&genre=&category=, one random game)
  if (seg0 === "random") {
    let games = await fetchGames();
    if (q.provider) games = filterByProvider(games, q.provider as string);
    if (q.genre) games = filterByGenre(games, q.genre as string);
    if (q.category) games = filterByCategory(games, q.category as string);
    if (games.length === 0) return sendJson(res, 404, { error: "No games match the given filters" });
    return sendJson(res, 200, games[Math.floor(Math.random() * games.length)]);
  }

  // GET /api/genres        (distinct genres with game counts)
  if (seg0 === "genres") {
    const games = await fetchGames();
    return sendJson(res, 200, listGenres(games));
  }

  // GET /api/categories    (distinct Steam categories with game counts)
  if (seg0 === "categories") {
    const games = await fetchGames();
    return sendJson(res, 200, listCategories(games));
  }

  // GET /api/search?q=&page=&limit=
  if (seg0 === "search") {
    const qStr = ((q.q as string) || "").trim();
    const games = await fetchGames();
    let combined = games;
    if (qStr) {
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
      combined = [...results, ...extra];
    }
    if (q.page || q.limit) {
      return sendJson(res, 200, paginate(combined, Number(q.page) || 1, Number(q.limit) || 60));
    }
    return sendJson(res, 200, combined);
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
        image: "/api/image/:slugOrHash",
        image_screenshot: "/api/image/:slugOrHash/screenshot/:index",
        image_movie_thumb: "/api/image/:slugOrHash/movie/:index",
        image_achievement: "/api/image/:slugOrHash/achievement/:index",
        download: "/api/download/:slug",
        encode_get: "/api/encode/:hashOrSlug",
        encode_post: "/api/encode",
        short_link: "/api/d/:id",
        video: "/api/video/:slugOrHash/:movieIndex",
        game_media: "/api/games/:slugOrHash/media",
        game_images: "/api/games/:slugOrHash/images",
        game_videos: "/api/games/:slugOrHash/videos",
        game_similar: "/api/games/:slugOrHash/similar",
        random: "/api/random",
        genres: "/api/genres",
        categories: "/api/categories",
      },
    });
  }

  // GET /api/trending
  if (seg0 === "trending") {
    const games = await fetchGames();
    return sendJson(res, 200, sortGames(games, "newest").slice(0, 12));
  }

  // GET /api/recent   (?limit=, default 24)
  if (seg0 === "recent") {
    const [games, stats] = await Promise.all([fetchGames(), fetchStats()]);
    return sendJson(res, 200, getNewGames(games, stats, Number(q.limit) || 24));
  }

  // GET /api/updated  (?limit=, default 24)
  if (seg0 === "updated") {
    const [games, stats] = await Promise.all([fetchGames(), fetchStats()]);
    return sendJson(res, 200, getUpdatedGames(games, stats, Number(q.limit) || 24));
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

  // GET /api/image/:id                       (proxy Steam header image by slug or hash)
  // GET /api/image/:id/screenshot/:index     (proxy a Steam screenshot)
  // GET /api/image/:id/movie/:index          (proxy a trailer thumbnail)
  // GET /api/image/:id/achievement/:index    (proxy an achievement icon)
  // GET /api/image/:id/banner                (proxy the large page background — falls back to header)
  if (seg0 === "image") {
    if (!seg1) return sendJson(res, 400, { error: "Missing game slug or hash" });
    const games = await fetchGames();
    const game = findBySlug(games, seg1) || findByHash(games, seg1);
    if (!game) return sendJson(res, 404, { error: "Game not found" });

    let imageUrl: string | undefined;
    if (seg2 === "screenshot") {
      imageUrl = game.steam?.screenshots?.[Number(seg3)];
    } else if (seg2 === "movie") {
      imageUrl = game.steam?.movies?.[Number(seg3)]?.thumbnail;
    } else if (seg2 === "achievement") {
      imageUrl = game.steam?.achievements_highlighted?.[Number(seg3)]?.path;
    } else if (seg2 === "banner") {
      imageUrl = game.steam?.background_raw || game.steam?.header_image;
    } else {
      imageUrl = game.steam?.header_image;
    }

    if (!imageUrl) return sendJson(res, 404, { error: "No image available for this game" });
    return proxyImage(res, imageUrl);
  }

  // GET /api/video/:id/:index  (proxy trailer, entry point — resolves the real CDN URL server-side)
  if (seg0 === "video") {
    if (!seg1 || seg2 === undefined) return sendJson(res, 400, { error: "Missing game slug/hash or movie index" });
    const games = await fetchGames();
    const game = findBySlug(games, seg1) || findByHash(games, seg1);
    if (!game) return sendJson(res, 404, { error: "Game not found" });
    const movie = game.steam?.movies?.[Number(seg2)];
    const videoUrl = movie?.hls_h264 || movie?.dash_h264;
    if (!videoUrl) return sendJson(res, 404, { error: "No video available for this movie" });
    return proxyMedia(res, videoUrl, req.headers.range);
  }

  // GET /api/media/:token[/...rest]  (opaque token for manifest sub-resources — no raw URL ever exposed)
  // `rest` shows up for DASH segments resolved against a rewritten <BaseURL> directory token.
  if (seg0 === "media") {
    const [token, ...rest] = segs.slice(1);
    if (!token) return sendJson(res, 400, { error: "Missing media token" });
    const base = resolveMediaToken(token);
    if (!base) return sendJson(res, 404, { error: "Media token expired or invalid" });
    const mediaUrl = rest.length > 0 ? base + rest.join("/") : base;
    return proxyMedia(res, mediaUrl, req.headers.range);
  }

  return sendJson(res, 404, { error: "API endpoint not found" });
}

export default createHandler(router, { methods: ["GET", "POST"] });
