import { useCallback, useEffect, useState } from "react";

import type { CatalogEntry, CatalogStats } from "@/domain/catalog";
import { getCachedCatalog, syncCatalog } from "@/infrastructure/tauri/commands";

/** Loads the cached catalog instantly, then refreshes it from the network in the background. */
export function useCatalog() {
  const [games, setGames] = useState<CatalogEntry[]>([]);
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const result = await syncCatalog();
      setGames(result.games);
      setStats(result.stats);
    } catch (e) {
      setError(String(e));
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    getCachedCatalog()
      .then((cached) => {
        if (cancelled || !cached) return;
        setGames(cached.games);
        setStats(cached.stats);
        setLoading(false);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) void refresh();
      });

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return { games, stats, loading, syncing, error, refresh };
}
