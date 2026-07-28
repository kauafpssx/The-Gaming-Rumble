import type { IncomingMessage, ServerResponse } from "http";
import { readFileSync } from "fs";
import { join } from "path";
import { type Game, type GameStats } from "./_games";

const GAMES_API_URL = process.env.VITE_GAMES_API_URL;
const STATS_API_URL = process.env.VITE_STATS_API_URL;
const LOCAL_GAMES_PATH = join(process.cwd(), "online_fix_games.json");

let _gamesCache: Game[] | null = null;
let _gamesCacheTs = 0;
const GAMES_CACHE_TTL = 5 * 60 * 1000; // 5 min

function loadLocalGames(): Game[] {
  const raw = readFileSync(LOCAL_GAMES_PATH, "utf-8");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = JSON.parse(raw) as any;
  return (json.downloads || json) as Game[];
}

export async function fetchGames(): Promise<Game[]> {
  if (_gamesCache && Date.now() - _gamesCacheTs < GAMES_CACHE_TTL) return _gamesCache;

  let games: Game[];
  if (GAMES_API_URL) {
    const r = await fetch(`${GAMES_API_URL}?t=${Date.now()}`);
    if (!r.ok) throw new Error("Failed to fetch games dataset");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await r.json()) as any;
    games = (json.downloads || json) as Game[];
  } else {
    // No remote env configured — fallback to the local dataset file.
    games = loadLocalGames();
  }

  _gamesCache = games;
  _gamesCacheTs = Date.now();
  return games;
}

export async function fetchStats(): Promise<GameStats | null> {
  if (!STATS_API_URL) return null;
  try {
    const r = await fetch(`${STATS_API_URL}?t=${Date.now()}`);
    if (!r.ok) return null;
    return (await r.json()) as GameStats;
  } catch {
    return null;
  }
}

export function getPathParam(url: string | undefined): string {
  if (!url) return "";
  const pathname = url.split("?")[0];
  const parts = pathname.split("/");
  return decodeURIComponent(parts[parts.length - 1] || "");
}

export function cors(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Api-Key");
}

export function sendJson(res: ServerResponse, status: number, body: unknown) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

// ── Image proxy cache ─────────────────────────────────────────────────────────
const _imgCache = new Map<string, { buf: Buffer; ct: string; ts: number }>();
const IMG_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function proxyImage(res: ServerResponse, imageUrl: string) {
  cors(res);

  const cached = _imgCache.get(imageUrl);
  if (cached && Date.now() - cached.ts < IMG_CACHE_TTL) {
    res.writeHead(200, {
      "Content-Type": cached.ct,
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    });
    return res.end(cached.buf);
  }

  try {
    const upstream = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) {
      return sendJson(res, upstream.status, { error: "Failed to fetch image" });
    }
    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await upstream.arrayBuffer());
    _imgCache.set(imageUrl, { buf, ct: contentType, ts: Date.now() });

    // evict old entries every 1000 images
    if (_imgCache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of _imgCache) {
        if (now - v.ts > IMG_CACHE_TTL) _imgCache.delete(k);
      }
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(buf);
  } catch (err) {
    console.error("[image-proxy]", imageUrl, err);
    if (!res.headersSent) sendJson(res, 502, { error: "Image proxy failed" });
  }
}

// ── Generic media proxy (video manifests/segments) ────────────────────────────
// Some networks block Steam's CDN domains for direct browser requests, so trailer
// playback is routed through here too. HLS (.m3u8) manifests are text playlists
// referencing further URIs (sub-manifests or segments) — those are rewritten to
// point back through this same proxy so the whole chain stays same-origin.
const ALLOWED_MEDIA_HOSTS = [/\.steamstatic\.com$/i, /\.akamaihd\.net$/i, /\.steampowered\.com$/i];

export function isAllowedMediaUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    return protocol === "https:" && ALLOWED_MEDIA_HOSTS.some((rx) => rx.test(hostname));
  } catch {
    return false;
  }
}

// Opaque token for sub-manifest/segment URLs — reversible (not stored), so it
// survives across serverless invocations that don't share memory. Security
// comes from isAllowedMediaUrl's host allowlist, not from the token being secret.
export function registerMediaToken(absoluteUrl: string): string {
  return Buffer.from(absoluteUrl, "utf-8").toString("base64url");
}

export function resolveMediaToken(id: string): string | undefined {
  try {
    const url = Buffer.from(id, "base64url").toString("utf-8");
    return isAllowedMediaUrl(url) ? url : undefined;
  } catch {
    return undefined;
  }
}

function mediaProxyPath(absoluteUrl: string): string {
  return `/api/media/${registerMediaToken(absoluteUrl)}`;
}

function rewriteM3u8(body: string, baseUrl: string): string {
  return body
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Tag lines (#EXT-X-MAP, #EXT-X-KEY, #EXT-X-PART, ...) carry their own
      // referenced URL in a URI="..." attribute — fMP4/CMAF playlists use
      // #EXT-X-MAP:URI="init-stream.m4s" for the init segment, which is easy
      // to miss since it looks like a comment line.
      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/, (full, uri) => {
          try {
            return `URI="${mediaProxyPath(new URL(uri, baseUrl).href)}"`;
          } catch {
            return full;
          }
        });
      }

      try {
        return mediaProxyPath(new URL(trimmed, baseUrl).href);
      } catch {
        return line;
      }
    })
    .join("\n");
}

// DASH manifests (.mpd) reference segments via <BaseURL> (usually a relative
// directory, e.g. "dash_h264/") which players resolve client-side against the
// manifest's own URL. Since the manifest is served from /api/media/:token, that
// relative resolution would hit our own path instead of the real CDN — so we
// rewrite <BaseURL> to a path-absolute proxied "directory" token. Segment
// requests then land on /api/media/:token/<file>, which the router reattaches
// to the real base URL.
function rewriteMpd(body: string, baseUrl: string): string {
  return body.replace(/(<BaseURL[^>]*>)([^<]*)(<\/BaseURL>)/gi, (full, open, content, close) => {
    try {
      const abs = new URL(content.trim(), baseUrl).href;
      let proxied = mediaProxyPath(abs);
      if (!proxied.endsWith("/")) proxied += "/";
      return `${open}${proxied}${close}`;
    } catch {
      return full;
    }
  });
}

export async function proxyMedia(res: ServerResponse, mediaUrl: string, rangeHeader?: string) {
  cors(res);

  if (!isAllowedMediaUrl(mediaUrl)) {
    return sendJson(res, 400, { error: "Blocked media host" });
  }

  try {
    const upstream = await fetch(mediaUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!upstream.ok && upstream.status !== 206) {
      return sendJson(res, upstream.status, { error: "Failed to fetch media" });
    }
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const isHls = /mpegurl/i.test(contentType) || /\.m3u8(\?|$)/i.test(mediaUrl);
    const isMpd = /dash\+xml/i.test(contentType) || /\.mpd(\?|$)/i.test(mediaUrl);

    if (isHls) {
      const text = await upstream.text();
      res.writeHead(200, {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "public, max-age=60",
      });
      return res.end(rewriteM3u8(text, mediaUrl));
    }

    if (isMpd) {
      const text = await upstream.text();
      res.writeHead(200, {
        "Content-Type": "application/dash+xml",
        "Cache-Control": "public, max-age=60",
      });
      return res.end(rewriteMpd(text, mediaUrl));
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
      "Accept-Ranges": "bytes",
    };
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) headers["Content-Range"] = contentRange;

    res.writeHead(upstream.status === 206 ? 206 : 200, headers);
    res.end(buf);
  } catch (err) {
    console.error("[media-proxy]", mediaUrl, err);
    if (!res.headersSent) sendJson(res, 502, { error: "Media proxy failed" });
  }
}

export function getJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if ((req as IncomingMessage & { body?: unknown }).body) {
      resolve((req as IncomingMessage & { body?: unknown }).body);
      return;
    }
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
    req.on("error", reject);
  });
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
// In-memory, per serverless instance. For distributed limiting use Vercel KV.
const _rl = new Map<string, { n: number; reset: number }>();

function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
): { ok: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const entry = _rl.get(key);

  if (!entry || now > entry.reset) {
    _rl.set(key, { n: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1, reset: now + windowMs };
  }
  if (entry.n >= limit) {
    return { ok: false, remaining: 0, reset: entry.reset };
  }
  entry.n++;
  return { ok: true, remaining: limit - entry.n, reset: entry.reset };
}

function getIp(req: IncomingMessage): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function isMasterKey(key: string | undefined): boolean {
  const master = process.env.MASTER_API_KEY?.trim();
  return !!master && master === key;
}

function isValidKey(key: string | undefined): boolean {
  if (!key) return false;
  if (isMasterKey(key)) return true;
  const keys = (process.env.API_KEYS ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  return keys.includes(key);
}

// ── Handler factory ───────────────────────────────────────────────────────────
export interface HandlerOpts {
  methods?: string[];
  /** Require a valid X-Api-Key header */
  requireKey?: boolean;
  /** Requests/min without a key (default 60) */
  rateLimit?: number;
  /** Requests/min with a valid key (default 300) */
  rateLimitWithKey?: number;
}

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<unknown>;

export function createHandler(fn: Handler, opts: HandlerOpts = {}) {
  const {
    methods = ["GET"],
    requireKey = false,
    rateLimit = 60,
    rateLimitWithKey = 300,
  } = opts;

  return async (req: IncomingMessage, res: ServerResponse) => {
    cors(res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (!methods.includes(req.method ?? "")) {
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    const apiKey = req.headers["x-api-key"] as string | undefined;
    const master = isMasterKey(apiKey);
    const hasKey = master || isValidKey(apiKey);

    if (requireKey && !hasKey) {
      return sendJson(res, 401, {
        error: "Unauthorized",
        hint: "Include a valid X-Api-Key header. See /api for documentation.",
      });
    }

    // Master key bypasses rate limiting entirely
    if (!master) {
      const ip = getIp(req);
      const limit = hasKey ? rateLimitWithKey : rateLimit;
      const rl = checkRateLimit(`${ip}:${req.url?.split("?")[0]}`, limit);

      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
      res.setHeader("X-RateLimit-Reset", String(Math.floor(rl.reset / 1000)));

      if (!rl.ok) {
        const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000);
        res.setHeader("Retry-After", String(retryAfter));
        return sendJson(res, 429, {
          error: "Too Many Requests",
          retryAfter,
          hint: "Include X-Api-Key for a higher rate limit (300 req/min).",
        });
      }
    } else {
      res.setHeader("X-RateLimit-Limit", "unlimited");
      res.setHeader("X-RateLimit-Remaining", "unlimited");
    }

    try {
      await fn(req, res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Internal server error";
      console.error("[api]", req.url, err);
      if (!res.headersSent) sendJson(res, 500, { error: msg });
    }
  };
}
