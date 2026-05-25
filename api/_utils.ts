import type { IncomingMessage, ServerResponse } from "http";
import { type Game, type GameStats } from "./_games";

const GAMES_API_URL = process.env.VITE_GAMES_API_URL;
const STATS_API_URL = process.env.VITE_STATS_API_URL;

export async function fetchGames(): Promise<Game[]> {
  if (!GAMES_API_URL) throw new Error("VITE_GAMES_API_URL env var not set");
  const r = await fetch(`${GAMES_API_URL}?t=${Date.now()}`);
  if (!r.ok) throw new Error("Failed to fetch games dataset");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = (await r.json()) as any;
  return (json.downloads || json) as Game[];
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
