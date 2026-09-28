import { useCallback, useEffect, useState } from "react";

import type { CatalogEntry } from "@/domain/catalog";
import type { GamePayload } from "@/domain/game";
import { decodeGamePayload, extractMagnetHash } from "@/domain/payload-codec";
import { consumePendingDeeplink } from "@/infrastructure/tauri/commands";
import { onDeepLink } from "@/infrastructure/tauri/events";
import { LAST_PROTOCOL_PAYLOAD_KEY } from "@/infrastructure/storage/keys";
import { readJson, writeJson } from "@/infrastructure/storage/local-storage";

/** Finds the catalog entry that matches a light deep-link payload, by magnet hash then title. */
export function enrichPayloadWithCatalog(payload: GamePayload, catalogGames: CatalogEntry[]): CatalogEntry | GamePayload {
  const hash = extractMagnetHash(payload.magnet);
  const byHash = hash ? catalogGames.find((g) => extractMagnetHash(g.magnet) === hash) : undefined;
  if (byHash) return byHash;

  const normalizedTitle = payload.title.trim().toLowerCase();
  const byTitle = catalogGames.find((g) => g.title.trim().toLowerCase() === normalizedTitle);
  return byTitle ?? payload;
}

interface Params {
  catalogGames: CatalogEntry[];
  isProtocolLocked: boolean;
  onGameReady: (game: GamePayload | CatalogEntry) => void;
  addLog: (tag: "WARNING", msg: string) => void;
}

export function useDeepLinkGame({ catalogGames, isProtocolLocked, onGameReady, addLog }: Params) {
  const [lastProtocolPayload, setLastProtocolPayload] = useState<GamePayload | null>(() =>
    readJson<GamePayload>(LAST_PROTOCOL_PAYLOAD_KEY)
  );

  const processUrl = useCallback(
    (rawUrl: string) => {
      if (isProtocolLocked) {
        addLog("WARNING", "Novo magnet ignorado porque ja existe uma instalacao em andamento.");
        return;
      }

      const payload = decodeGamePayload(rawUrl);
      if (!payload) return;

      writeJson(LAST_PROTOCOL_PAYLOAD_KEY, payload);
      setLastProtocolPayload(payload);
      onGameReady(enrichPayloadWithCatalog(payload, catalogGames));
    },
    [isProtocolLocked, addLog, onGameReady, catalogGames]
  );

  useEffect(() => {
    let disposed = false;

    consumePendingDeeplink()
      .then((pendingUri) => {
        if (!disposed && pendingUri) processUrl(pendingUri);
      })
      .catch((error) => console.warn("[DEEP-LINK] Failed to consume pending URI:", error));

    const un = onDeepLink((uri) => processUrl(uri));

    return () => {
      disposed = true;
      void un.then((f) => f());
    };
  }, [processUrl]);

  const openLastProtocol = useCallback(() => {
    if (!lastProtocolPayload || isProtocolLocked) return;
    onGameReady(enrichPayloadWithCatalog(lastProtocolPayload, catalogGames));
  }, [lastProtocolPayload, isProtocolLocked, onGameReady, catalogGames]);

  return { lastProtocolPayload, openLastProtocol };
}
