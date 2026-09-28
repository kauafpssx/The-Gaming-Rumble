import { useEffect, useState } from "react";

import type { DriveInfo } from "@/infrastructure/tauri/commands";
import { createGamingRumbleFolder, listDrives } from "@/infrastructure/tauri/commands";
import { DRIVES_CACHE_KEY, STORAGE_KEY_DRIVE } from "@/infrastructure/storage/keys";
import { readJson, writeJson, writeString } from "@/infrastructure/storage/local-storage";

export function useDriveSelection(onDriveChange: (drive: string) => void, locked: boolean) {
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

  async function selectDrive(drive: DriveInfo) {
    if (locked) return;
    try {
      await createGamingRumbleFolder(drive.name);
      writeString(STORAGE_KEY_DRIVE, drive.name);
      onDriveChange(drive.name);
    } catch (error) {
      console.error(error);
    }
  }

  return { drives, loading, selectDrive };
}
