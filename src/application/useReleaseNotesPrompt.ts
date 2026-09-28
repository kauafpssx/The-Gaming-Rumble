import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";

import { getReleaseNotes } from "@/releaseNotes";
import { POST_UPDATE_CHANGELOG_KEY } from "@/infrastructure/storage/keys";
import { readString, remove } from "@/infrastructure/storage/local-storage";

/** Opens the changelog automatically right after an app update finishes installing. */
export function useReleaseNotesPrompt() {
  const [releaseNotesState, setReleaseNotesState] = useState({ open: false, version: "", markdown: "" });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const pendingVersion = readString(POST_UPDATE_CHANGELOG_KEY);
      if (!pendingVersion) return;

      try {
        const currentVersion = await getVersion();
        if (cancelled || currentVersion !== pendingVersion) return;

        const markdown = getReleaseNotes(currentVersion);
        if (!markdown) {
          remove(POST_UPDATE_CHANGELOG_KEY);
          return;
        }

        setReleaseNotesState({ open: true, version: currentVersion, markdown });
        remove(POST_UPDATE_CHANGELOG_KEY);
      } catch (error) {
        console.warn("[CHANGELOG] Failed to open post-update changelog:", error);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  function openReleaseNotes(version: string) {
    const markdown = getReleaseNotes(version);
    if (!markdown) return;
    setReleaseNotesState({ open: true, version, markdown });
  }

  function closeReleaseNotes() {
    setReleaseNotesState((prev) => ({ ...prev, open: false }));
  }

  return { releaseNotesState, openReleaseNotes, closeReleaseNotes };
}
