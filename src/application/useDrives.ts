import { useEffect, useState } from "react";

import type { DriveInfo } from "@/infrastructure/tauri/commands";
import { listDrives } from "@/infrastructure/tauri/commands";
import { DRIVES_CACHE_KEY } from "@/infrastructure/storage/keys";
import { readJson, writeJson } from "@/infrastructure/storage/local-storage";

/** All local drives with free/total space, cached in localStorage and refreshed from disk. */
export function useDrives() {
  const [drives, setDrives] = useState<DriveInfo[]>(() => readJson<DriveInfo[]>(DRIVES_CACHE_KEY) ?? []);
  const [loading, setLoading] = useState(() => !readJson<DriveInfo[]>(DRIVES_CACHE_KEY));

  useEffect(() => {
    listDrives()
      .then((nextDrives) => {
        setDrives(nextDrives);
        writeJson(DRIVES_CACHE_KEY, nextDrives);
      })
      .finally(() => setLoading(false));
  }, []);

  return { drives, loading };
}
