import { useState, useCallback } from "react";
import { X, Send, Copy, Check, ExternalLink, KeyRound, Gauge } from "lucide-react";
import { type RouteDefinition, METHOD_STYLES, buildUrl } from "./routes";
import { RoutePath } from "./route-path";

interface RateLimitInfo {
  limit: string;
  remaining: string;
  reset: string;
}

export function TryModal({
  route,
  globalApiKey,
  onClose,
}: {
  route: RouteDefinition;
  globalApiKey: string;
  onClose: () => void;
}) {
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
            <RoutePath path={route.path} />
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
