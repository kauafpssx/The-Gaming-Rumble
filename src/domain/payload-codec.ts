import type { GamePayload } from "./game";

export function decodeGamePayload(raw: string): GamePayload | null {
  try {
    let normalized = raw.trim().replace(/^"+|"+$/g, "");
    const protocolIdx = normalized.toLowerCase().indexOf("gaming-rumble://");
    if (protocolIdx >= 0) {
      normalized = normalized.slice(protocolIdx);
    }

    let b64 = normalized.replace(/^gaming-rumble:\/\//i, "");
    b64 = decodeURIComponent(b64)
      .trim()
      .replace(/^"+|"+$/g, "")
      .replace(/\s/g, "")
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    while (b64.endsWith("/")) b64 = b64.slice(0, -1);
    while (b64.length % 4 !== 0) b64 += "=";

    const json = decodeURIComponent(escape(atob(b64)));
    const parsed = JSON.parse(json) as GamePayload;
    if (!parsed.title || !parsed.magnet || !parsed.parts) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Extrai o hash BTIH de um magnet link (usado para cruzar com o catálogo). */
export function extractMagnetHash(magnet: string): string | null {
  const match = magnet.match(/xt=urn:btih:([a-zA-Z0-9]+)/);
  return match ? match[1].toLowerCase() : null;
}
