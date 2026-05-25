import { fetchStats, sendJson, createHandler } from "./_utils";

export default createHandler(async (req, res) => {
  const stats = await fetchStats();
  if (!stats) return sendJson(res, 500, { error: "Stats not available" });
  return sendJson(res, 200, stats);
});
