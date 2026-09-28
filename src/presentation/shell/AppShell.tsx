import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getCurrentWindow } from "@tauri-apps/api/window";

import type { InstallableGame } from "@/domain/game";
import { useAdminStatus } from "@/application/useAdminStatus";
import { useAppUpdate } from "@/application/useAppUpdate";
import { useAutoExtraction } from "@/application/useAutoExtraction";
import { useCatalog } from "@/application/useCatalog";
import { useDeepLinkGame } from "@/application/useDeepLinkGame";
import { useDefenderAutoDisable } from "@/application/useDefenderAutoDisable";
import { useDownloadActions } from "@/application/useDownloadActions";
import { useDownloadEventListeners } from "@/application/useDownloadEventListeners";
import { useDownloadState } from "@/application/useDownloadState";
import { useInstalledTitles } from "@/application/useInstalledTitles";
import { useLibraryInstalledIndex } from "@/application/useLibraryInstalledIndex";
import { useReleaseNotesPrompt } from "@/application/useReleaseNotesPrompt";
import { normalizeTitle } from "@/application/useLibraryInstalledIndex";
import { getDiskSpace } from "@/infrastructure/tauri/commands";
import { onAppVisibilityChanged } from "@/infrastructure/tauri/events";
import { SHOW_GAMES_WITHOUT_STEAM_METADATA_KEY, STORAGE_KEY_DRIVE } from "@/infrastructure/storage/keys";
import { readString, writeString } from "@/infrastructure/storage/local-storage";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CatalogView } from "@/presentation/catalog/CatalogView";
import { GameDetailModal } from "@/presentation/game-modal/GameDetailModal";
import { LibraryView } from "@/presentation/library/LibraryView";
import { AppUpdateModal } from "@/presentation/modals/AppUpdateModal";
import { ReleaseNotesModal } from "@/presentation/modals/ReleaseNotesModal";
import { SettingsView } from "@/presentation/settings/SettingsView";

import { ActivityBar } from "./ActivityBar";
import { ActivityPanel } from "./ActivityPanel";
import { Sidebar, type ShellView } from "./Sidebar";
import { TitleBar } from "./TitleBar";

export default function AppShell() {
  const [view, setView] = useState<ShellView>("catalog");
  const [isWindowVisible, setIsWindowVisible] = useState(true);
  const [defaultDrive, setDefaultDrive] = useState(() => readString(STORAGE_KEY_DRIVE) ?? "C:\\");
  const [showGamesWithoutMetadata, setShowGamesWithoutMetadata] = useState(
    () => readString(SHOW_GAMES_WITHOUT_STEAM_METADATA_KEY) === "true"
  );
  const [activeGame, setActiveGame] = useState<InstallableGame | null>(null);
  const [activityPanelOpen, setActivityPanelOpen] = useState(false);

  const isAdmin = useAdminStatus();
  useDefenderAutoDisable();

  const { downloadState, setDownloadState, addLog } = useDownloadState();
  useDownloadEventListeners(setDownloadState);

  const isUpdateBlocking = false;
  const isDriveSelectionLocked = Boolean(downloadState && downloadState.phase !== "done" && downloadState.phase !== "error");
  const isProtocolLocked = Boolean(downloadState && ["downloading", "extracting", "applying_fix"].includes(downloadState.phase));

  const catalog = useCatalog();
  const visibleCatalogGames = useMemo(
    () => (showGamesWithoutMetadata ? catalog.games : catalog.games.filter((g) => Boolean(g.steamAppId))),
    [catalog.games, showGamesWithoutMetadata]
  );
  const { games: installedGames, refresh: refreshInstalledGames } = useInstalledTitles();
  const installedTitles = useLibraryInstalledIndex(installedGames);
  const totalUsedGb = useMemo(() => installedGames.reduce((sum, g) => sum + (g.size_gb || 0), 0), [installedGames]);

  // Re-scan the library every time the user opens the Catalog tab, so "Instalado"/"Jogar"
  // reflects installs, uninstalls or cancels that happened while they were elsewhere.
  useEffect(() => {
    if (view === "catalog") void refreshInstalledGames();
  }, [view, refreshInstalledGames]);

  const [freeGb, setFreeGb] = useState<string>("");
  useEffect(() => {
    getDiskSpace(defaultDrive).then((r) => setFreeGb(r !== "N/A" ? r : "")).catch(() => setFreeGb(""));
  }, [defaultDrive, installedGames.length]);

  useAutoExtraction({ downloadState, setDownloadState, addLog });
  const { startInstall, downloadFixOnly, startHttpInstall, downloadFixOnlyHttp, pauseOrResume, cancel, finish } = useDownloadActions({
    setDownloadState,
    addLog,
  });

  const { lastProtocolPayload, openLastProtocol } = useDeepLinkGame({
    catalogGames: catalog.games,
    isProtocolLocked,
    onGameReady: setActiveGame,
    addLog,
  });

  const { appUpdate, handleInstallAppUpdate } = useAppUpdate();
  const { releaseNotesState, openReleaseNotes, closeReleaseNotes } = useReleaseNotesPrompt();

  useEffect(() => {
    const un = onAppVisibilityChanged(setIsWindowVisible);
    return () => void un.then((f) => f());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "F4") {
        e.preventDefault();
        if (!isUpdateBlocking) getCurrentWindow().close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isUpdateBlocking]);

  const handleDriveChange = useCallback((drive: string) => {
    writeString(STORAGE_KEY_DRIVE, drive);
    setDefaultDrive(drive);
  }, []);

  return (
    <TooltipProvider>
      <div className="relative flex flex-col h-screen bg-background text-white font-inter overflow-hidden">
        {isWindowVisible ? (
          <>
            <TitleBar interactionLocked={isUpdateBlocking} />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar currentView={view} onViewChange={setView} interactionLocked={isUpdateBlocking} />

              <AnimatePresence mode="wait">
                <motion.div key={view} className="flex-1 flex flex-col overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {view === "catalog" && (
                    <CatalogView
                      games={visibleCatalogGames}
                      stats={catalog.stats}
                      loading={catalog.loading}
                      syncing={catalog.syncing}
                      error={catalog.error}
                      installedTitles={installedTitles}
                      onOpenGame={setActiveGame}
                      onPlayInstalled={() => setView("library")}
                      onRefresh={catalog.refresh}
                    />
                  )}
                  {view === "library" && <LibraryView />}
                  {view === "settings" && (
                    <SettingsView
                      defaultDrive={defaultDrive}
                      onDriveChange={handleDriveChange}
                      driveSelectionLocked={isDriveSelectionLocked}
                      isAdmin={isAdmin}
                      catalogStats={catalog.stats}
                      catalogGameCount={visibleCatalogGames.length}
                      catalogSyncing={catalog.syncing}
                      onCatalogRefresh={catalog.refresh}
                      onShowGamesWithoutMetadataChange={setShowGamesWithoutMetadata}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <ActivityBar
              downloadState={downloadState}
              onExpand={() => setActivityPanelOpen(true)}
              onVersionClick={openReleaseNotes}
              hasLastProtocol={Boolean(lastProtocolPayload)}
              onLastProtocolClick={openLastProtocol}
              latestProtocolLocked={isProtocolLocked}
              catalogStats={view === "catalog" ? catalog.stats : null}
              libraryStats={view === "library" ? { count: installedGames.length, usedGb: totalUsedGb, freeGb } : null}
              onRandomGame={
                view === "catalog" && visibleCatalogGames.length > 0
                  ? () => setActiveGame(visibleCatalogGames[Math.floor(Math.random() * visibleCatalogGames.length)])
                  : undefined
              }
            />
          </>
        ) : (
          <div className="flex-1 bg-background" />
        )}

        <ActivityPanel
          open={activityPanelOpen && Boolean(downloadState)}
          onOpenChange={setActivityPanelOpen}
          state={downloadState}
          isPaused={downloadState?.isPaused ?? false}
          onPause={() => downloadState && pauseOrResume(downloadState)}
          onCancel={() => {
            if (downloadState) cancel(downloadState);
            setActivityPanelOpen(false);
          }}
          onStartGame={() => {
            if (downloadState) finish(downloadState);
            setActivityPanelOpen(false);
          }}
        />

        <GameDetailModal
          game={activeGame}
          defaultDrive={defaultDrive}
          installed={Boolean(activeGame && installedTitles.has(normalizeTitle(activeGame.title)))}
          onClose={() => setActiveGame(null)}
          onPlayInstalled={() => {
            setActiveGame(null);
            setView("library");
          }}
          onStart={(path) => {
            if (activeGame) startInstall(activeGame, path);
            setActiveGame(null);
          }}
          onDownloadFixOnly={(path) => {
            if (activeGame) downloadFixOnly(activeGame, path);
            setActiveGame(null);
          }}
          onDownloadHttp={(path, files) => {
            if (activeGame) startHttpInstall(activeGame, path, files);
            setActiveGame(null);
          }}
          onDownloadFixOnlyHttp={(path, url, fileName) => {
            if (activeGame) downloadFixOnlyHttp(activeGame, path, url, fileName);
            setActiveGame(null);
          }}
        />

        <ReleaseNotesModal open={releaseNotesState.open} version={releaseNotesState.version} markdown={releaseNotesState.markdown} onClose={closeReleaseNotes} />
        <AppUpdateModal state={appUpdate} onInstall={handleInstallAppUpdate} />
      </div>
    </TooltipProvider>
  );
}
