import { fetchGames, sendJson, getPathParam, createHandler } from "../_utils";
import { findBySlug } from "../../src/lib/games";

export default createHandler(async (req, res) => {
  const slug = getPathParam(req.url);
  if (!slug) return sendJson(res, 400, { error: "Missing slug parameter" });

  const games = await fetchGames();
  const game = findBySlug(games, slug);
  if (!game) return sendJson(res, 404, { error: "Game not found" });

  return sendJson(res, 200, game);
});
