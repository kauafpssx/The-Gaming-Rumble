import { fetchGames, sendJson, createHandler } from "./_utils";

export default createHandler(async (req, res) => {
  const start = Date.now();
  const games = await fetchGames();
  return sendJson(res, 200, {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
    database: {
      connected: true,
      gamesCount: games.length,
      latencyMs: Date.now() - start,
    },
  });
});
