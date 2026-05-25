import { fetchGames, sendJson, getPathParam, createHandler } from "../_utils";
import { findByHash, findBySlug, makeProtocolUrl } from "../../src/lib/games";

export default createHandler(async (req, res) => {
  const param = getPathParam(req.url);
  if (!param) return sendJson(res, 400, { error: "Missing hash or slug parameter" });

  const games = await fetchGames();
  const game = findByHash(games, param) || findBySlug(games, param);
  if (!game) return sendJson(res, 404, { error: "Game not found" });

  return sendJson(res, 200, {
    title: game.title,
    unique_hash: game.unique_hash,
    protocolUrl: makeProtocolUrl(game),
  });
});
