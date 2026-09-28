import { useEffect } from "react";

import { getDefenderStatus, setDefenderRealtimeMonitoring } from "@/infrastructure/tauri/commands";
import { DISABLE_DEFENDER_ON_START_KEY } from "@/infrastructure/storage/keys";
import { readString, writeString } from "@/infrastructure/storage/local-storage";

/** Disables Windows Defender realtime monitoring on boot, per user preference. */
export function useDefenderAutoDisable() {
  useEffect(() => {
    const shouldDisable = readString(DISABLE_DEFENDER_ON_START_KEY) !== "false";
    if (!shouldDisable) return;

    getDefenderStatus()
      .then((status) => {
        if (!status.available) {
          writeString(DISABLE_DEFENDER_ON_START_KEY, "false");
          return;
        }
        return setDefenderRealtimeMonitoring(true);
      })
      .catch((error) => console.warn("[DEFENDER] Failed to disable realtime monitoring on startup:", error));
  }, []);
}
