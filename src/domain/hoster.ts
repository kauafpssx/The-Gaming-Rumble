import type { CatalogEntry, CatalogHosterLink } from "./catalog";
import type { HttpDownloadFile } from "./download";

/**
 * Pixeldrain é o único hoster do catálogo com API pública gratuita e sem key para
 * baixar o arquivo direto (os demais — Gofile, FileDitch, VikingFile, Rootz, FileKeeper —
 * exigem conta paga, resolvem por trás de captcha/Cloudflare, ou não têm API estável).
 * `https://pixeldrain.com/u/{id}` -> `https://pixeldrain.com/api/file/{id}`.
 */
export function pixeldrainDirectUrl(hosterName: string, link: string): string | null {
  if (hosterName.toLowerCase() !== "pixeldrain") return null;
  const match = link.match(/pixeldrain\.com\/u\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  return `https://pixeldrain.com/api/file/${match[1]}`;
}

function isFixOrRepairFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.includes("fix") || lower.includes("repair");
}

/**
 * Cada entrada de hoster mistura o jogo com o(s) fix(es) — mesma pasta "Fix Repair/"
 * que o backend já filtra na extração (services/archive/mod.rs). O índice não é
 * confiável (o fix às vezes vem primeiro na lista), então filtra por nome. Só retorna
 * algo quando existe exatamente UM arquivo de jogo — o motor de download HTTP baixa um
 * arquivo por vez, então um repack multi-volume (vários .rar do jogo) cairia pra torrent.
 */
export function selectPixeldrainGameLink(links: CatalogHosterLink[] | undefined): CatalogHosterLink | null {
  if (!links?.length) return null;
  const gameLinks = links.filter((l) => !isFixOrRepairFile(l.fileName));
  return gameLinks.length === 1 ? gameLinks[0] : null;
}

/** Mesma regra do jogo, mas pro(s) arquivo(s) de fix/repair — só aceita exatamente UM. */
export function selectPixeldrainFixLink(links: CatalogHosterLink[] | undefined): CatalogHosterLink | null {
  if (!links?.length) return null;
  const fixLinks = links.filter((l) => isFixOrRepairFile(l.fileName));
  return fixLinks.length === 1 ? fixLinks[0] : null;
}

/** O jogo precisa de um fix separado se algum dos arquivos do repack (qualquer hoster) for de fix/repair. */
function gameNeedsFix(catalog: CatalogEntry): boolean {
  return catalog.files.some((f) => isFixOrRepairFile(f.name));
}

/**
 * Monta a lista de arquivos pra um install completo via Pixeldrain. Só retorna algo
 * quando o Pixeldrain tem TUDO que o jogo precisa: o arquivo do jogo sempre, e o fix
 * também se o jogo exigir um (a maioria exige). Faltando qualquer peça — só o fix, só o
 * jogo quando o fix é obrigatório, múltiplos arquivos ambíguos — retorna null e a opção
 * de Pixeldrain fica escondida na UI, caindo pro torrent.
 */
export function getPixeldrainFullDownload(catalog: CatalogEntry): HttpDownloadFile[] | null {
  const links = catalog.hosterLinks.Pixeldrain;
  const gameLink = selectPixeldrainGameLink(links);
  if (!gameLink) return null;
  const gameUrl = pixeldrainDirectUrl("Pixeldrain", gameLink.directLink);
  if (!gameUrl) return null;
  const gameFile: HttpDownloadFile = { url: gameUrl, fileName: gameLink.fileName || `${catalog.title}.rar` };

  if (!gameNeedsFix(catalog)) return [gameFile];

  const fixLink = selectPixeldrainFixLink(links);
  if (!fixLink) return null;
  const fixUrl = pixeldrainDirectUrl("Pixeldrain", fixLink.directLink);
  if (!fixUrl) return null;
  const fixFile: HttpDownloadFile = { url: fixUrl, fileName: fixLink.fileName || `${catalog.title}_Fix.rar` };

  return [gameFile, fixFile];
}

/** Link direto do fix via Pixeldrain, pro botão "baixar somente o fix". */
export function getPixeldrainFixOnly(catalog: CatalogEntry): HttpDownloadFile | null {
  const fixLink = selectPixeldrainFixLink(catalog.hosterLinks.Pixeldrain);
  if (!fixLink) return null;
  const url = pixeldrainDirectUrl("Pixeldrain", fixLink.directLink);
  if (!url) return null;
  return { url, fileName: fixLink.fileName || `${catalog.title}_Fix.rar` };
}
