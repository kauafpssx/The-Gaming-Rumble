import type { IncomingMessage, ServerResponse } from "http";
import { readFileSync } from "fs";
import { join } from "path";
import { fetchGames } from "./_utils";
import { findBySlug, findByHash, toSlug } from "./_games";

let _template: string | null = null;
function loadTemplate(): string {
  if (_template) return _template;
  _template = readFileSync(join(process.cwd(), "dist", "index.html"), "utf-8");
  return _template;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const pathname = (req.url || "").split("?")[0];
    const slugRaw = decodeURIComponent(pathname.replace(/^\/game\//, "").replace(/\/$/, ""));

    const games = await fetchGames();
    const game = findBySlug(games, slugRaw) || findByHash(games, slugRaw);

    let html = loadTemplate();

    if (game) {
      const proto = (req.headers["x-forwarded-proto"] as string) || "https";
      const host = req.headers.host || "gr-link.vercel.app";
      const pageUrl = `${proto}://${host}/game/${toSlug(game.title)}`;
      const imageUrl = `${proto}://${host}/api/image/${toSlug(game.title)}`;

      const title = escapeAttr(`${game.title} - Gaming Rumble`);
      const description = escapeAttr(
        game.steam?.short_description_native || game.steam?.short_description || "Baixe jogos gratis na Gaming Rumble."
      );

      html = html
        .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
        .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${description}">`)
        .replace(/<meta property="og:image" content=".*?">/, `<meta property="og:image" content="${imageUrl}">`)
        .replace(/<meta name="twitter:image" content=".*?">/, `<meta name="twitter:image" content="${imageUrl}">`)
        .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${title}">`)
        .replace(/<meta name="twitter:title" content=".*?">/, `<meta name="twitter:title" content="${title}">`)
        .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${description}">`)
        .replace(/<meta name="twitter:description" content=".*?">/, `<meta name="twitter:description" content="${description}">`)
        .replace(/<meta property="og:type" content=".*?" \/>/, `<meta property="og:type" content="website" />\n    <meta property="og:url" content="${pageUrl}" />`);
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  } catch (err) {
    console.error("[og]", req.url, err);
    // Fall back to plain SPA shell on any failure
    try {
      const html = loadTemplate();
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    } catch {
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  }
}
