import { fetchGames, fetchStats, sendJson, createHandler } from "./_utils";
import { sortGames } from "../src/lib/games";

export default createHandler(async (req, res) => {
  const [games, stats] = await Promise.all([fetchGames(), fetchStats()]);
  let result = games.filter((g) => stats?.latest_run_new_game_names?.includes(g.title));
  if (result.length === 0) result = sortGames(games, "newest").slice(0, 24);
  return sendJson(res, 200, result);
});
