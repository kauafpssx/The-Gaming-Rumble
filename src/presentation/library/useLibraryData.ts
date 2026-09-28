import { useCallback, useEffect, useState } from "react";

import { fetchAllDrivesLibrary } from "@/application/fetchAllDrivesLibrary";
import type { LibraryEntry } from "@/domain/library";
import { getShortcutStates } from "@/infrastructure/tauri/commands";
import { onLibraryEntryUpdated } from "@/infrastructure/tauri/events";
import { libraryCacheKey, shortcutCacheKey } from "@/infrastructure/storage/keys";
import { readJson, writeJson } from "@/infrastructure/storage/local-storage";

export const LIBRARY_ALL_CACHE_KEY = libraryCacheKey("all");
export const SHORTCUT_ALL_CACHE_KEY = shortcutCacheKey("all");

const CACHE_KEY = LIBRARY_ALL_CACHE_KEY;
const SHORTCUT_CACHE_KEY = SHORTCUT_ALL_CACHE_KEY;

/** Loads the installed-games library across every drive, cached in localStorage and refreshed from disk. */
export function useLibraryData() {
  const [games, setGames] = useState<LibraryEntry[]>(() => readJson<LibraryEntry[]>(CACHE_KEY) ?? []);
  const [loading, setLoading] = useState(() => !readJson<LibraryEntry[]>(CACHE_KEY));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shortcutState, setShortcutState] = useState<Record<string, boolean>>(() => readJson(SHORTCUT_CACHE_KEY) ?? {});

  const patchEntry = (entry: LibraryEntry) => {
    setGames((prev) => {
      const next = prev.map((game) => (game.install_path === entry.install_path ? { ...game, ...entry } : game));
      writeJson(CACHE_KEY, next);
      return next;
    });
  };

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const nextGames = await fetchAllDrivesLibrary();
      setGames(nextGames);
      writeJson(CACHE_KEY, nextGames);

      const nextShortcuts = nextGames.length > 0 ? await getShortcutStates(nextGames.map((g) => g.title)).catch(() => ({})) : {};
      setShortcutState(nextShortcuts);
      writeJson(SHORTCUT_CACHE_KEY, nextShortcuts);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const un = onLibraryEntryUpdated((payload) => patchEntry(payload.entry));
    return () => void un.then((f) => f());
  }, []);

  return { games, setGames, loading, isRefreshing, shortcutState, setShortcutState, refresh };
}
