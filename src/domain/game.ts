/**
 * Payload enviado pelo Bot do Discord via deep-link
 * Codificado em Base64 e passado como: gaming-rumble://[BASE64]
 */
export interface GamePayload {
  title: string;
  banner: string;
  parts: number;
  fileSize: string;
  magnet: string;
}

import type { CatalogEntry } from "./catalog";

/**
 * Payload usado pelo modal de instalação: um GamePayload puro (deep-link sem
 * match no catálogo) ou um CatalogEntry completo (clique no catálogo, ou
 * deep-link enriquecido) — ambos compartilham title/banner/parts/fileSize/magnet.
 */
export type InstallableGame = GamePayload | CatalogEntry;

export function isCatalogEntry(game: InstallableGame): game is CatalogEntry {
  return "genres" in game;
}

/**
 * Windows nao aceita <>:"/\|?* em nomes de pasta, nem pasta terminando em
 * "." ou espaco (ex.: "R.E.P.O." falha silenciosamente ao criar a pasta e o
 * download nunca comeca). Mantem so letras, numeros e espacos - remove tudo
 * mais (pontos, dois-pontos, aspas etc.), depois colapsa espacos e corta as
 * pontas. Usado so para o nome da pasta de instalacao - o titulo exibido na
 * UI nao muda.
 */
export function sanitizeFolderName(title: string): string {
  const cleaned = title
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Jogo";
}
