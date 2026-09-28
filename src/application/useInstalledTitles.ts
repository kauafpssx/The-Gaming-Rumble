import { useCallback, useEffect, useState } from "react";

import type { LibraryEntry } from "@/domain/library";
import { onLibraryEntryUpdated } from "@/infrastructure/tauri/events";

import { fetchAllDrivesLibrary } from "./fetchAllDrivesLibrary";

/** Lightweight installed-games list across every drive, used to cross-reference the catalog and to total disk usage. */
export function useInstalledTitles() {
  const [games, setGames] = useState<LibraryEntry[]>([]);

  const refresh = useCallback(() => {
    return fetchAllDrivesLibrary()
      .then((result) => setGames(result))
      .catch(() => {});
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const un = onLibraryEntryUpdated((payload) => {
      setGames((prev) => (prev.some((g) => g.install_path === payload.entry.install_path) ? prev.map((g) => (g.install_path === payload.entry.install_path ? { ...g, ...payload.entry } : g)) : [...prev, payload.entry]));
    });
    return () => void un.then((f) => f());
  }, []);

  return { games, refresh };
}
