import { fetchGames, sendJson, createHandler } from "./_utils";
import { sortGames } from "../src/lib/games";

export default createHandler(async (req, res) => {
  const games = await fetchGames();
  return sendJson(res, 200, sortGames(games, "newest").slice(0, 12));
});
