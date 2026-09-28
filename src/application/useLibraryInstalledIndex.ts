import { useMemo } from "react";

import type { LibraryEntry } from "@/domain/library";

export function normalizeTitle(title: string) {
  return title.trim().toLowerCase();
}

/** Set of normalized titles currently installed, used to flag catalog cards as "Jogar". */
export function useLibraryInstalledIndex(games: LibraryEntry[]) {
  return useMemo(() => new Set(games.map((game) => normalizeTitle(game.title))), [games]);
}
