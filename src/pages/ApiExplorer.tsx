import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, X, Send, Copy, Check, ExternalLink, Download, KeyRound, Eye, EyeOff, Gauge } from "lucide-react";

interface Param {
  name: string;
  type: "path" | "query";
  example?: string;
}

interface RouteDefinition {
  method: "GET" | "POST";
  path: string;
  description: string;
  params: Param[];
  body?: boolean;
  bodyExample?: string;
  /** Rate limit per minute without key */
  rateLimit?: number;
  /** Requires X-Api-Key */
  requireKey?: boolean;
}

interface Category {
  id: string;
  label: string;
  color: string;
  routes: RouteDefinition[];
}

const API_CATEGORIES: Category[] = [
  {
    id: "catalog",
    label: "Catálogo",
    color: "cyan",
    routes: [
      { method: "GET", path: "/api/games", description: "Lista todos os jogos no catálogo", params: [], rateLimit: 60 },
      {
        method: "GET",
        path: "/api/games/:slug",
        description: "Busca jogo pelo slug",
        params: [{ name: "slug", type: "path", example: "cyberpunk-2077" }],
        rateLimit: 60,
      },
      {
        method: "GET",
        path: "/api/games/hash/:hash",
        description: "Busca jogo pelo info hash do torrent",
        params: [{ name: "hash", type: "path", example: "a3f2d..." }],
        rateLimit: 60,
      },
      {
        method: "GET",
        path: "/api/search",
        description: "Busca por título, hash, provider ou tag de gênero",
        params: [{ name: "q", type: "query", example: "cyberpunk" }],
        rateLimit: 60,
      },
      { method: "GET", path: "/api/stats", description: "Total de jogos, torrents e última sincronização", params: [], rateLimit: 60 },
    ],
  },
  {
    id: "discovery",
    label: "Descoberta",
    color: "violet",
    routes: [
      { method: "GET", path: "/api/trending", description: "12 jogos mais recentes em alta", params: [], rateLimit: 60 },
      { method: "GET", path: "/api/recent", description: "24 jogos recém-adicionados ao catálogo", params: [], rateLimit: 60 },
      { method: "GET", path: "/api/updated", description: "24 jogos atualizados recentemente", params: [], rateLimit: 60 },
      {
        method: "GET",
        path: "/api/providers",
        description: "Lista de providers disponíveis: torrent, gofile, pixeldrain…",
        params: [],
        rateLimit: 60,
      },
    ],
  },
  {
    id: "deeplink",
    label: "Deep Link",
    color: "emerald",
    routes: [
      {
        method: "GET",
        path: "/api/download/:slug",
        description: "Payload completo gaming-rumble:// para abrir no app nativo",
        params: [{ name: "slug", type: "path", example: "cyberpunk-2077" }],
        rateLimit: 60,
      },
      {
        method: "GET",
        path: "/api/encode/:hashOrSlug",
        description: "URL gaming-rumble:// direta, pronta para uso via hash ou slug",
        params: [{ name: "hashOrSlug", type: "path", example: "cyberpunk-2077" }],
        rateLimit: 60,
      },
      {
        method: "POST",
        path: "/api/encode",
        description: "Codifica payload customizado em Base64 URL-safe",
        params: [],
        body: true,
        bodyExample: JSON.stringify(
          { game: { title: "Meu Jogo", magnet: "magnet:?xt=urn:btih:HASH", fileSize: "10 GB", files: [] } },
          null,
          2
        ),
        rateLimit: 10,
        requireKey: false,
      },
      {
        method: "GET",
        path: "/api/d/:id",
        description: "Resolver de link curto — ideal para bots do Discord",
        params: [{ name: "id", type: "path", example: "abc123" }],
        rateLimit: 60,
      },
    ],
  },
  {
    id: "system",
    label: "Sistema",
    color: "amber",
    routes: [
      { method: "GET", path: "/api/health", description: "Status da API, latência e contagem de jogos", params: [], rateLimit: 60 },
      {
        method: "GET",
        path: "/api/manifest",
        description: "Versão do ecossistema, protocolo suportado e mapa de endpoints",
        params: [],
        rateLimit: 60,
      },
    ],
  },
];

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-cyan-950/80 text-cyan-300 border border-cyan-700/50",
  POST: "bg-violet-950/80 text-violet-300 border border-violet-700/50",
};

const CATEGORY_ACCENT: Record<string, string> = {
  cyan: "text-cyan-400 border-cyan-700/40 bg-cyan-950/20",
  violet: "text-violet-400 border-violet-700/40 bg-violet-950/20",
  emerald: "text-emerald-400 border-emerald-700/40 bg-emerald-950/20",
  amber: "text-amber-400 border-amber-700/40 bg-amber-950/20",
};

const CATEGORY_DOT: Record<string, string> = {
  cyan: "bg-cyan-400",
  violet: "bg-violet-400",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
};

function buildUrl(path: string, pathValues: Record<string, string>, queryValues: Record<string, string>): string {
  let url = path;
  for (const [key, val] of Object.entries(pathValues)) {
    url = url.replace(`:${key}`, encodeURIComponent(val));
  }
  const qs = Object.entries(queryValues)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return qs ? `${url}?${qs}` : url;
}

function formatPathWithHighlight(path: string) {
  return path.split("/").map((seg, i) => {
    if (seg.startsWith(":")) {
      return (
        <span key={i} className="text-amber-400">
          /{seg}
        </span>
      );
    }
    return <span key={i}>{i === 0 ? "" : "/"}{seg}</span>;
  });
}

interface TryModalProps {
  route: RouteDefinition;
  globalApiKey: string;
  onClose: () => void;
}

interface RateLimitInfo {
  limit: string;
  remaining: string;
  reset: string;
}

function TryModal({ route, globalApiKey, onClose }: TryModalProps) {
  const IS_DEV = import.meta.env.DEV;
  const pathParams = route.params.filter((p) => p.type === "path");
  const queryParams = route.params.filter((p) => p.type === "query");

  const [pathValues, setPathValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(pathParams.map((p) => [p.name, p.example ?? ""]))
  );
  const [queryValues, setQueryValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(queryParams.map((p) => [p.name, p.example ?? ""]))
  );
  const [body, setBody] = useState(route.bodyExample ?? "");
  const [response, setResponse] = useState<{ status: number; ms: number; body: string } | null>(null);
  const [rateInfo, setRateInfo] = useState<RateLimitInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedRes, setCopiedRes] = useState(false);

  const builtUrl = buildUrl(route.path, pathValues, queryValues);

  const handleSend = useCallback(async () => {
    if (IS_DEV) {
      setResponse({
        status: 0,
        ms: 0,
        body: "Funções serverless não executam com `bun dev`.\n\nUse `bun run dev:full` (vercel dev) para testar as rotas da API localmente.\n\nEm produção (Vercel) todas as rotas funcionam normalmente.",
      });
      return;
    }

    setLoading(true);
    setResponse(null);
    setRateInfo(null);
    const start = Date.now();

    try {
      const headers: Record<string, string> = {};
      if (route.method === "POST") headers["Content-Type"] = "application/json";
      if (globalApiKey.trim()) headers["X-Api-Key"] = globalApiKey.trim();

      const opts: RequestInit =
        route.method === "POST"
          ? { method: "POST", headers, body }
          : { method: "GET", headers };

      const res = await fetch(builtUrl, opts);
      const ms = Date.now() - start;

      setRateInfo({
        limit: res.headers.get("X-RateLimit-Limit") ?? "-",
        remaining: res.headers.get("X-RateLimit-Remaining") ?? "-",
        reset: res.headers.get("X-RateLimit-Reset") ?? "-",
      });

      const text = await res.text();
      let pretty = text;
      try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch (_) { /* not json */ }
      setResponse({ status: res.status, ms, body: pretty });
    } catch (err) {
      setResponse({ status: 0, ms: Date.now() - start, body: String(err) });
    } finally {
      setLoading(false);
    }
  }, [builtUrl, route.method, body, globalApiKey, IS_DEV]);

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.origin + builtUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const copyRes = () => {
    if (!response) return;
    navigator.clipboard.writeText(response.body);
    setCopiedRes(true);
    setTimeout(() => setCopiedRes(false), 2000);
  };

  const statusColor =
    response === null
      ? ""
      : response.status >= 200 && response.status < 300
      ? "text-emerald-400 bg-emerald-950/50 border-emerald-700/40"
      : response.status === 429
      ? "text-amber-400 bg-amber-950/50 border-amber-700/40"
      : "text-red-400 bg-red-950/50 border-red-700/40";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-backdrop-in"
      style={{ background: "rgba(8,12,20,0.85)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-xl border border-border/60 animate-scale-in overflow-hidden"
        style={{ background: "hsl(220 18% 11%)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
          <span className={`text-xs font-bold font-mono px-2 py-1 rounded ${METHOD_STYLES[route.method]}`}>
            {route.method}
          </span>
          <code className="text-sm text-foreground/90 font-mono flex-1 truncate">
            {formatPathWithHighlight(route.path)}
          </code>
          {route.rateLimit && (
            <span className="text-xs text-muted-foreground/60 flex items-center gap-1 shrink-0">
              <Gauge size={11} />
              {route.rateLimit}/min
            </span>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Dev mode banner inside modal */}
        {IS_DEV && (
          <div className="px-5 py-2 bg-amber-950/30 border-b border-amber-700/30">
            <p className="text-xs text-amber-400/80">
              Dev mode — use <code className="font-mono bg-amber-950/60 px-1 rounded">bun run dev:full</code> para testar
            </p>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-5">
          {/* Active API key indicator */}
          {globalApiKey.trim() && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-700/30 rounded-lg px-3 py-2">
              <KeyRound size={12} />
              API key ativa — limite: 300 req/min
            </div>
          )}

          {/* Path params */}
          {pathParams.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Path Params</p>
              {pathParams.map((p) => (
                <div key={p.name} className="flex items-center gap-3">
                  <label className="text-xs font-mono text-amber-400 w-28 shrink-0">:{p.name}</label>
                  <input
                    className="flex-1 bg-background/60 border border-border/50 rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
                    placeholder={p.example ?? p.name}
                    value={pathValues[p.name] ?? ""}
                    onChange={(e) => setPathValues((v) => ({ ...v, [p.name]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Query params */}
          {queryParams.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Query Params</p>
              {queryParams.map((p) => (
                <div key={p.name} className="flex items-center gap-3">
                  <label className="text-xs font-mono text-cyan-400 w-28 shrink-0">?{p.name}</label>
                  <input
                    className="flex-1 bg-background/60 border border-border/50 rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
                    placeholder={p.example ?? p.name}
                    value={queryValues[p.name] ?? ""}
                    onChange={(e) => setQueryValues((v) => ({ ...v, [p.name]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Body */}
          {route.body && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Request Body (JSON)</p>
              <textarea
                className="w-full h-40 bg-background/60 border border-border/50 rounded-lg px-3 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors resize-none scrollbar-thin"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                spellCheck={false}
              />
            </div>
          )}

          {/* Constructed URL */}
          <div className="rounded-lg bg-background/40 border border-border/30 px-3 py-2.5 flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">URL</span>
            <code className="text-xs font-mono text-primary/80 flex-1 truncate">{builtUrl}</code>
            <button onClick={copyUrl} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
              {copiedUrl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>

          {/* Rate limit info */}
          {rateInfo && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
              <Gauge size={12} />
              <span>Limite: <b className="text-muted-foreground">{rateInfo.limit}</b>/min</span>
              <span>Restantes: <b className="text-muted-foreground">{rateInfo.remaining}</b></span>
              <span>Reset: <b className="text-muted-foreground">{new Date(Number(rateInfo.reset) * 1000).toLocaleTimeString()}</b></span>
            </div>
          )}

          {/* Response */}
          {response && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">Resposta</p>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${statusColor}`}>
                  {response.status || "ERR"}
                </span>
                <span className="text-xs text-muted-foreground">{response.ms}ms</span>
                <button onClick={copyRes} className="text-muted-foreground hover:text-foreground transition-colors">
                  {copiedRes ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </div>
              <pre className="bg-background/60 border border-border/30 rounded-lg p-3 text-xs font-mono text-foreground/80 overflow-auto max-h-72 scrollbar-thin whitespace-pre-wrap break-all">
                {response.body}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/40 flex gap-2">
          <button
            onClick={handleSend}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold rounded-lg py-2 text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Enviando..." : "Enviar"}
          </button>
          <a
            href={window.location.origin + builtUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 flex items-center justify-center rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}

const IS_DEV_MODE = import.meta.env.DEV;

export default function ApiExplorer() {
  const [activeModal, setActiveModal] = useState<RouteDefinition | null>(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("gr_api_key") ?? "");

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    if (val.trim()) {
      localStorage.setItem("gr_api_key", val);
    } else {
      localStorage.removeItem("gr_api_key");
    }
  };
  const [showKey, setShowKey] = useState(false);
  const [copiedCollection, setCopiedCollection] = useState(false);

  const totalRoutes = API_CATEGORIES.reduce((n, c) => n + c.routes.length, 0);

  const downloadCollection = () => {
    const baseUrl = window.location.origin;

    const authHeader = (disabled = false) => ({
      key: "X-Api-Key",
      value: "{{apiKey}}",
      type: "text",
      disabled,
    });

    const makeRequest = (route: RouteDefinition) => {
      const pathSegments = route.path.split("/").filter(Boolean);
      const pathVars = route.params
        .filter((p) => p.type === "path")
        .map((p) => ({ key: p.name, value: p.example ?? p.name }));
      const queryVars = route.params
        .filter((p) => p.type === "query")
        .map((p) => ({ key: p.name, value: p.example ?? "", description: p.name }));

      const rawPath = pathSegments.map((s) => (s.startsWith(":") ? `:${s.slice(1)}` : s)).join("/");
      const rawQs = queryVars.length ? "?" + queryVars.map((q) => `${q.key}=${q.value}`).join("&") : "";

      const req: Record<string, unknown> = {
        method: route.method,
        header: [authHeader()],
        url: {
          raw: `{{baseUrl}}/${rawPath}${rawQs}`,
          host: ["{{baseUrl}}"],
          path: pathSegments,
          ...(queryVars.length ? { query: queryVars } : {}),
          ...(pathVars.length ? { variable: pathVars } : {}),
        },
        description: route.description,
      };

      if (route.body && route.bodyExample) {
        req.body = {
          mode: "raw",
          raw: route.bodyExample,
          options: { raw: { language: "json" } },
        };
        (req.header as unknown[]).push({ key: "Content-Type", value: "application/json" });
      }

      return req;
    };

    const collection = {
      info: {
        name: "Gaming Rumble API",
        description: `API pública do ecossistema Gaming Rumble.\nBase URL: ${baseUrl}\nGerado em: ${new Date().toISOString()}`,
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        version: "1.0.0",
      },
      variable: [
        { key: "baseUrl", value: baseUrl, type: "string" },
        { key: "apiKey", value: apiKey.trim() || "", type: "string" },
      ],
      item: API_CATEGORIES.map((cat) => ({
        name: cat.label,
        item: cat.routes.map((route) => ({
          name: `${route.method} ${route.path}`,
          request: makeRequest(route),
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(collection, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gaming-rumble-api.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyBaseUrl = () => {
    navigator.clipboard.writeText(window.location.origin + "/api");
    setCopiedCollection(true);
    setTimeout(() => setCopiedCollection(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b border-border/40"
        style={{ background: "hsl(220 20% 7% / 0.85)", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link
            to="/page/1"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={16} />
            Catálogo
          </Link>
          <div className="flex-1" />
          <span className="text-xs font-mono text-muted-foreground/60 border border-border/40 px-2 py-0.5 rounded">
            v1.0
          </span>
          <span className="text-xs font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">
            {totalRoutes} rotas
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Dev mode warning */}
        {IS_DEV_MODE && (
          <div className="flex items-start gap-3 bg-amber-950/40 border border-amber-700/40 rounded-xl px-4 py-3 text-sm">
            <span className="text-amber-400 text-base shrink-0">⚠</span>
            <div>
              <p className="text-amber-300 font-semibold">Modo desenvolvimento — funções serverless inativas</p>
              <p className="text-amber-400/70 text-xs mt-0.5">
                Use{" "}
                <code className="bg-amber-950/60 border border-amber-700/30 px-1.5 py-0.5 rounded font-mono">
                  bun run dev:full
                </code>{" "}
                (vercel dev) para testar as rotas. Em produção (Vercel) todas funcionam normalmente.
              </p>
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                Gaming Rumble{" "}
                <span className="text-primary" style={{ textShadow: "0 0 30px hsl(195 90% 70% / 0.4)" }}>
                  API
                </span>
              </h1>
              <p className="mt-2 text-muted-foreground max-w-xl text-sm leading-relaxed">
                API REST pública para bots, apps e integrações. JSON com CORS aberto.
                O ID único de cada jogo é o <span className="text-primary font-mono">info hash</span> do torrent.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={copyBaseUrl}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
              >
                {copiedCollection ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span className="font-mono text-xs">/api</span>
              </button>
              <button
                onClick={downloadCollection}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm hover:bg-primary/20 transition-colors"
              >
                <Download size={14} />
                Postman / Insomnia
              </button>
            </div>
          </div>

          {/* Rate limit info card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-card border border-border/40 rounded-xl p-4 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Sem API Key</p>
              <p className="text-2xl font-bold text-foreground">60</p>
              <p className="text-xs text-muted-foreground">requisições / minuto</p>
            </div>
            <div className="bg-card border border-primary/20 rounded-xl p-4 space-y-1">
              <p className="text-xs text-primary uppercase tracking-wider flex items-center gap-1.5"><KeyRound size={11} /> Com X-Api-Key</p>
              <p className="text-2xl font-bold text-primary">300</p>
              <p className="text-xs text-muted-foreground">requisições / minuto</p>
            </div>
            <div className="bg-card border border-border/40 rounded-xl p-4 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">POST /api/encode</p>
              <p className="text-2xl font-bold text-amber-400">10 <span className="text-base font-normal text-muted-foreground">/ 60</span></p>
              <p className="text-xs text-muted-foreground">sem key / com key</p>
            </div>
          </div>

          {/* API Key input */}
          <div className="bg-card border border-border/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound size={14} className="text-primary" />
              <p className="text-sm font-semibold text-foreground">X-Api-Key</p>
              <span className="text-xs text-muted-foreground/50">— aplicada em todos os requests desta página</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showKey ? "text" : "password"}
                  className="w-full bg-background/60 border border-border/50 rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors pr-10"
                  placeholder="sk-gr-..."
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                />
                <button
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {apiKey && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-700/30 rounded-lg px-3">
                  <Check size={12} />
                  Ativa
                </div>
              )}
            </div>
          </div>

          {/* Base URL */}
          <div className="inline-flex items-center gap-2 bg-card border border-border/40 rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground">Base URL</span>
            <code className="text-xs font-mono text-primary">
              {typeof window !== "undefined" ? window.location.origin : "https://gr-link.vercel.app"}/api
            </code>
          </div>
        </div>

        {/* Categories */}
        {API_CATEGORIES.map((cat) => (
          <section key={cat.id} className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${CATEGORY_ACCENT[cat.color]}`}>
                {cat.label}
              </span>
              <div className="flex-1 h-px bg-border/30" />
              <span className="text-xs text-muted-foreground/50">{cat.routes.length} endpoints</span>
            </div>

            <div className="grid gap-2">
              {cat.routes.map((route) => (
                <RouteCard
                  key={route.method + route.path}
                  route={route}
                  accentColor={cat.color}
                  onTry={() => setActiveModal(route)}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Footer note */}
        <div className="text-center py-6 border-t border-border/20 space-y-1">
          <p className="text-xs text-muted-foreground/50">
            Rate limit por IP · CORS * · Respostas em JSON · Headers X-RateLimit-*
          </p>
          <p className="text-xs text-muted-foreground/30">
            Rate limiting em memória por instância — para distribuído use Vercel KV
          </p>
        </div>
      </main>

      {activeModal && (
        <TryModal route={activeModal} globalApiKey={apiKey} onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}

interface RouteCardProps {
  route: RouteDefinition;
  accentColor: string;
  onTry: () => void;
}

function RouteCard({ route, accentColor, onTry }: RouteCardProps) {
  return (
    <div className="group flex items-center gap-4 bg-card/50 hover:bg-card border border-border/30 hover:border-border/60 rounded-xl px-4 py-3 transition-all duration-200">
      <span className={`text-xs font-bold font-mono px-2 py-1 rounded shrink-0 ${METHOD_STYLES[route.method]}`}>
        {route.method}
      </span>

      <div className="flex-1 min-w-0">
        <code className="text-sm font-mono text-foreground/90">
          {formatPathWithHighlight(route.path)}
        </code>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{route.description}</p>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        {route.rateLimit && (
          <span className="text-xs flex items-center gap-1 text-muted-foreground/50 border border-border/30 px-1.5 py-0.5 rounded">
            <Gauge size={10} />
            {route.rateLimit}/m
          </span>
        )}
        {route.params.map((p) => (
          <span
            key={p.name}
            className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border/30"
          >
            {p.type === "path" ? ":" : "?"}
            {p.name}
          </span>
        ))}
      </div>

      <button
        onClick={onTry}
        className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 opacity-0 group-hover:opacity-100 ${CATEGORY_ACCENT[accentColor]}`}
      >
        <Send size={11} />
        Try
      </button>
    </div>
  );
}
