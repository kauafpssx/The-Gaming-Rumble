import { parse } from "url";
import { fetchGames, sendJson, createHandler } from "./_utils";
import { searchGames } from "../src/lib/games";

export default createHandler(async (req, res) => {
  const { query } = parse(req.url || "", true);
  const q = ((query.q as string) || "").trim();

  const games = await fetchGames();
  if (!q) return sendJson(res, 200, games);

  const results = searchGames(games, q);
  const lowerQ = q.toLowerCase();

  const extraMatches = games.filter((g) => {
    if (results.some((r) => r.unique_hash === g.unique_hash)) return false;
    if (g.unique_hash.toLowerCase().includes(lowerQ)) return true;
    if (g.hoster_links && Object.keys(g.hoster_links).some((p) => p.toLowerCase().includes(lowerQ))) return true;
    if (g.steam?.genres?.some((genre) => genre.description.toLowerCase().includes(lowerQ))) return true;
    if (g.steam?.categories?.some((cat) => cat.description.toLowerCase().includes(lowerQ))) return true;
    return false;
  });

  return sendJson(res, 200, [...results, ...extraMatches]);
});
