import { fetchGames, sendJson, getPathParam, createHandler } from "../_utils";
import { findByHash, findBySlug } from "../../src/lib/games";

export default createHandler(async (req, res) => {
  const id = getPathParam(req.url);
  if (!id) return sendJson(res, 400, { error: "Missing ID parameter" });

  const games = await fetchGames();
  const game = findByHash(games, id) || findBySlug(games, id);
  if (!game) return sendJson(res, 404, { error: "Game not found" });

  return sendJson(res, 200, game);
});
