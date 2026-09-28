import { useEffect, useState } from "react";

import type { AppUpdateModalState } from "@/domain/app-update";
import { checkForAppUpdate, installAppUpdate } from "@/infrastructure/tauri/commands";
import { onAppUpdateEvent } from "@/infrastructure/tauri/events";
import { POST_UPDATE_CHANGELOG_KEY } from "@/infrastructure/storage/keys";
import { remove, writeString } from "@/infrastructure/storage/local-storage";

const INITIAL_STATE: AppUpdateModalState = {
  visible: false,
  configured: false,
  stage: "idle",
  currentVersion: "",
  nextVersion: "",
  notes: "",
  progressPercent: 0,
  downloadedBytes: 0,
  totalBytes: null,
  errorMessage: "",
};

/** Checks for a launcher update on boot and drives the AppUpdateModal state machine. */
export function useAppUpdate() {
  const [appUpdate, setAppUpdate] = useState<AppUpdateModalState>(INITIAL_STATE);

  useEffect(() => {
    checkForAppUpdate()
      .then((result) => {
        if (!result?.configured || !result.available || !result.version) return;
        setAppUpdate({
          visible: true,
          configured: true,
          stage: "available",
          currentVersion: result.currentVersion,
          nextVersion: result.version,
          notes: result.notes ?? "",
          progressPercent: 0,
          downloadedBytes: 0,
          totalBytes: null,
          errorMessage: result.error ?? "",
        });
      })
      .catch((error) => console.warn("[UPDATER] Failed to check for updates:", error));
  }, []);

  useEffect(() => {
    const un = onAppUpdateEvent((payload) => {
      setAppUpdate((prev) => {
        if (!prev.configured && !prev.visible) return prev;

        switch (payload.event) {
          case "Started":
            return {
              ...prev,
              stage: "downloading",
              progressPercent: 0,
              downloadedBytes: 0,
              totalBytes: payload.data.contentLength ?? null,
              nextVersion: payload.data.version || prev.nextVersion,
              errorMessage: "",
            };
          case "Progress": {
            const totalBytes = payload.data.contentLength ?? prev.totalBytes;
            const downloadedBytes = payload.data.downloaded;
            const progressPercent = totalBytes && totalBytes > 0 ? Math.min((downloadedBytes / totalBytes) * 100, 100) : prev.progressPercent;
            return { ...prev, stage: "downloading", downloadedBytes, totalBytes, progressPercent };
          }
          case "FinishedDownload":
          case "Installing":
            return { ...prev, stage: "installing", progressPercent: 100 };
          case "Failed":
            return { ...prev, stage: "error", progressPercent: 0, errorMessage: payload.data.message };
          default:
            return prev;
        }
      });
    });

    return () => void un.then((f) => f());
  }, []);

  async function handleInstallAppUpdate() {
    if (appUpdate.stage === "downloading" || appUpdate.stage === "installing") return;

    setAppUpdate((prev) => ({ ...prev, visible: true, configured: true, stage: prev.stage === "error" ? "available" : prev.stage, errorMessage: "" }));

    try {
      if (appUpdate.nextVersion) writeString(POST_UPDATE_CHANGELOG_KEY, appUpdate.nextVersion);
      await installAppUpdate();
    } catch (error) {
      remove(POST_UPDATE_CHANGELOG_KEY);
      setAppUpdate((prev) => ({ ...prev, stage: "error", errorMessage: String(error) }));
    }
  }

  return { appUpdate, handleInstallAppUpdate };
}
