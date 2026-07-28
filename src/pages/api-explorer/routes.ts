export interface Param {
  name: string;
  type: "path" | "query";
  example?: string;
}

export interface RouteDefinition {
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

export interface Category {
  id: string;
  label: string;
  color: string;
  routes: RouteDefinition[];
}

export const API_CATEGORIES: Category[] = [
  {
    id: "catalog",
    label: "Catálogo",
    color: "cyan",
    routes: [
      {
        method: "GET",
        path: "/api/games",
        description: "Lista jogos do catálogo — filtra e pagina opcionalmente",
        params: [
          { name: "provider", type: "query", example: "" },
          { name: "genre", type: "query", example: "" },
          { name: "category", type: "query", example: "" },
          { name: "page", type: "query", example: "" },
          { name: "limit", type: "query", example: "" },
        ],
        rateLimit: 60,
      },
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
        description: "Busca por título, hash, provider ou tag de gênero — pagina opcionalmente",
        params: [
          { name: "q", type: "query", example: "cyberpunk" },
          { name: "page", type: "query", example: "" },
          { name: "limit", type: "query", example: "" },
        ],
        rateLimit: 60,
      },
      { method: "GET", path: "/api/stats", description: "Total de jogos, torrents e última sincronização", params: [], rateLimit: 60 },
      { method: "GET", path: "/api/genres", description: "Gêneros distintos com contagem de jogos", params: [], rateLimit: 60 },
      { method: "GET", path: "/api/categories", description: "Categorias Steam distintas com contagem de jogos", params: [], rateLimit: 60 },
    ],
  },
  {
    id: "discovery",
    label: "Descoberta",
    color: "violet",
    routes: [
      { method: "GET", path: "/api/trending", description: "12 jogos mais recentes em alta", params: [], rateLimit: 60 },
      {
        method: "GET",
        path: "/api/recent",
        description: "Jogos recém-adicionados ao catálogo",
        params: [{ name: "limit", type: "query", example: "24" }],
        rateLimit: 60,
      },
      {
        method: "GET",
        path: "/api/updated",
        description: "Jogos atualizados recentemente",
        params: [{ name: "limit", type: "query", example: "24" }],
        rateLimit: 60,
      },
      {
        method: "GET",
        path: "/api/random",
        description: "Um jogo aleatório — filtra por provider/gênero/categoria opcionalmente",
        params: [
          { name: "provider", type: "query", example: "" },
          { name: "genre", type: "query", example: "" },
          { name: "category", type: "query", example: "" },
        ],
        rateLimit: 60,
      },
      {
        method: "GET",
        path: "/api/games/:slug/similar",
        description: "Jogos relacionados por gênero em comum",
        params: [
          { name: "slug", type: "path", example: "cyberpunk-2077" },
          { name: "limit", type: "query", example: "12" },
        ],
        rateLimit: 60,
      },
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
    id: "media",
    label: "Mídia",
    color: "rose",
    routes: [
      {
        method: "GET",
        path: "/api/games/:slug/media",
        description: "Todas as URLs de mídia do jogo (imagens + vídeos), já prontas para uso",
        params: [{ name: "slug", type: "path", example: "cyberpunk-2077" }],
        rateLimit: 60,
      },
      {
        method: "GET",
        path: "/api/games/:slug/images",
        description: "Só as imagens: capa, screenshots e ícones de conquistas",
        params: [{ name: "slug", type: "path", example: "cyberpunk-2077" }],
        rateLimit: 60,
      },
      {
        method: "GET",
        path: "/api/games/:slug/videos",
        description: "Só os trailers, com thumbnail associada",
        params: [{ name: "slug", type: "path", example: "cyberpunk-2077" }],
        rateLimit: 60,
      },
      {
        method: "GET",
        path: "/api/image/:slug",
        description: "Proxy da imagem de capa (Steam header)",
        params: [{ name: "slug", type: "path", example: "cyberpunk-2077" }],
        rateLimit: 60,
      },
      {
        method: "GET",
        path: "/api/image/:slug/screenshot/:index",
        description: "Proxy de um screenshot",
        params: [
          { name: "slug", type: "path", example: "cyberpunk-2077" },
          { name: "index", type: "path", example: "0" },
        ],
        rateLimit: 60,
      },
      {
        method: "GET",
        path: "/api/video/:slug/:index",
        description: "Proxy do trailer (HLS/DASH), resolve a URL real da CDN no servidor",
        params: [
          { name: "slug", type: "path", example: "cyberpunk-2077" },
          { name: "index", type: "path", example: "0" },
        ],
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

export const METHOD_STYLES: Record<string, string> = {
  GET: "bg-cyan-950/80 text-cyan-300 border border-cyan-700/50",
  POST: "bg-violet-950/80 text-violet-300 border border-violet-700/50",
};

export const CATEGORY_ACCENT: Record<string, string> = {
  cyan: "text-cyan-400 border-cyan-700/40 bg-cyan-950/20",
  violet: "text-violet-400 border-violet-700/40 bg-violet-950/20",
  emerald: "text-emerald-400 border-emerald-700/40 bg-emerald-950/20",
  amber: "text-amber-400 border-amber-700/40 bg-amber-950/20",
  rose: "text-rose-400 border-rose-700/40 bg-rose-950/20",
};

export function buildUrl(path: string, pathValues: Record<string, string>, queryValues: Record<string, string>): string {
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
