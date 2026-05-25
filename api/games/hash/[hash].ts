import { fetchGames, sendJson, getPathParam, createHandler } from "../../_utils";
import { findByHash } from "../../../src/lib/games";

export default createHandler(async (req, res) => {
  const hash = getPathParam(req.url);
  if (!hash) return sendJson(res, 400, { error: "Missing hash parameter" });

  const games = await fetchGames();
  const game = findByHash(games, hash);
  if (!game) return sendJson(res, 404, { error: "Game not found" });

  return sendJson(res, 200, game);
});
