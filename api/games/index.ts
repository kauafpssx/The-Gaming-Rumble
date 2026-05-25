import { fetchGames, sendJson, createHandler } from "../_utils";

export default createHandler(async (req, res) => {
  const games = await fetchGames();
  return sendJson(res, 200, games);
});
