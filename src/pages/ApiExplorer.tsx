import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Copy, Check, Download } from "lucide-react";
import { API_CATEGORIES, CATEGORY_ACCENT, type RouteDefinition } from "@/pages/api-explorer/routes";
import { RouteCard } from "@/pages/api-explorer/route-card";
import { TryModal } from "@/pages/api-explorer/try-modal";
import { ApiKeyInput } from "@/pages/api-explorer/api-key-input";
import { RateLimitCards } from "@/pages/api-explorer/rate-limit-cards";
import { downloadPostmanCollection } from "@/pages/api-explorer/postman-export";

const IS_DEV_MODE = import.meta.env.DEV;

export default function ApiExplorer() {
  const [activeModal, setActiveModal] = useState<RouteDefinition | null>(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("gr_api_key") ?? "");
  const [copiedCollection, setCopiedCollection] = useState(false);

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    if (val.trim()) localStorage.setItem("gr_api_key", val);
    else localStorage.removeItem("gr_api_key");
  };

  const totalRoutes = API_CATEGORIES.reduce((n, c) => n + c.routes.length, 0);

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
                onClick={() => downloadPostmanCollection(apiKey)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm hover:bg-primary/20 transition-colors"
              >
                <Download size={14} />
                Postman / Insomnia
              </button>
            </div>
          </div>

          <RateLimitCards />
          <ApiKeyInput value={apiKey} onChange={handleApiKeyChange} />

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
