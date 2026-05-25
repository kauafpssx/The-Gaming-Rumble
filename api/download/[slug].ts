import { fetchGames, sendJson, getPathParam, createHandler } from "../_utils";
import { findBySlug, findByHash, makeProtocolUrl, encodeGameForDataUrl } from "../../src/lib/games";

export default createHandler(async (req, res) => {
  const slug = getPathParam(req.url);
  if (!slug) return sendJson(res, 400, { error: "Missing slug parameter" });

  const games = await fetchGames();
  const game = findByHash(games, slug) || findBySlug(games, slug);
  if (!game) return sendJson(res, 404, { error: "Game not found" });

  const protocolUrl = makeProtocolUrl(game);
  const dataPayload = encodeGameForDataUrl(game);

  return sendJson(res, 200, {
    title: game.title,
    unique_hash: game.unique_hash,
    protocolUrl,
    deepLinkUrl: `/?data=${dataPayload}`,
    dataPayload,
  });
});
