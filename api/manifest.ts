import { sendJson, createHandler } from "./_utils";

export default createHandler(async (req, res) => {
  return sendJson(res, 200, {
    name: "Gaming Rumble Ecosystem",
    version: "1.0.0",
    protocol: "gaming-rumble",
    supported_clients: { windows: ">=1.0.0" },
    auth: {
      type: "api-key",
      header: "X-Api-Key",
      public_limit: "60 req/min",
      key_limit: "300 req/min",
    },
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
});
