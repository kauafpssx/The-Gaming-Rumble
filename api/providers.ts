import { fetchGames, sendJson, createHandler } from "./_utils";

export default createHandler(async (req, res) => {
  const games = await fetchGames();
  const providers = new Set<string>(["torrent"]);
  games.forEach((g) => {
    if (g.hoster_links) {
      Object.keys(g.hoster_links).forEach((p) => providers.add(p.toLowerCase()));
    }
  });
  return sendJson(res, 200, Array.from(providers));
});
