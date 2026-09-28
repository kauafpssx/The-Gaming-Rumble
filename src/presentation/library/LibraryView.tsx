import { useMemo, useState } from "react";
import { Gamepad2, Hourglass, SearchX } from "lucide-react";

import type { LibraryEntry } from "@/domain/library";
import { driveOfPath } from "@/domain/library";
import {
  createShortcut,
  deleteFolder,
  launchAndTrackGame,
  openPath,
  removeFromLibrary,
  removeShortcut,
  showExePicker,
  stopTorrent,
  updateExecutable,
} from "@/infrastructure/tauri/commands";
import { writeJson } from "@/infrastructure/storage/local-storage";

import { DriveFilter } from "./DriveFilter";
import { LibraryCard } from "./LibraryCard";
import { LibraryToolbar } from "./LibraryToolbar";
import { LIBRARY_ALL_CACHE_KEY, SHORTCUT_ALL_CACHE_KEY, useLibraryData } from "./useLibraryData";

export function LibraryView() {
  const { games, setGames, loading, isRefreshing, shortcutState, setShortcutState } = useLibraryData();
  const [pendingRemovalTitle, setPendingRemovalTitle] = useState<string | null>(null);
  const [changingExeTitle, setChangingExeTitle] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedDrives, setSelectedDrives] = useState<Set<string>>(new Set());

  const availableDrives = useMemo(() => Array.from(new Set(games.map((g) => driveOfPath(g.install_path)))).sort(), [games]);

  function toggleDrive(drive: string) {
    setSelectedDrives((prev) => {
      const next = new Set(prev);
      if (next.has(drive)) next.delete(drive);
      else next.add(drive);
      return next;
    });
  }

  const filteredGames = useMemo(() => {
    const query = search.trim().toLowerCase();
    return games.filter((game) => {
      if (selectedDrives.size > 0 && !selectedDrives.has(driveOfPath(game.install_path))) return false;
      if (!query) return true;
      const exeName = game.executable ? game.executable.split("\\").pop()?.toLowerCase() ?? "" : "";
      return game.title.toLowerCase().includes(query) || exeName.includes(query);
    });
  }, [games, search, selectedDrives]);

  const removeGame = async (game: LibraryEntry) => {
    setPendingRemovalTitle(null);
    const drive = driveOfPath(game.install_path);
    const nextGames = games.filter((g) => g.install_path !== game.install_path);
    setGames(nextGames);
    writeJson(LIBRARY_ALL_CACHE_KEY, nextGames);

    const nextShortcuts = { ...shortcutState };
    delete nextShortcuts[game.title];
    setShortcutState(nextShortcuts);
    writeJson(SHORTCUT_ALL_CACHE_KEY, nextShortcuts);

    await stopTorrent().catch(() => {});
    await deleteFolder(game.install_path).catch(console.error);
    await removeShortcut(game.title).catch(() => {});
    await removeFromLibrary(drive, game.title).catch(console.error);
  };

  const playGame = async (game: LibraryEntry) => {
    if (!game.executable) {
      alert("Executavel nao encontrado. O jogo pode nao ter sido extraido corretamente.");
      return;
    }
    const drive = driveOfPath(game.install_path);
    await launchAndTrackGame(drive, game.title, game.executable, game.install_path).catch((e) => alert(`Erro ao iniciar jogo: ${e}`));
  };

  const changeExe = async (game: LibraryEntry) => {
    if (changingExeTitle) return;
    setChangingExeTitle(game.title);
    try {
      const filePath = await showExePicker(game.install_path);
      if (filePath) {
        const drive = driveOfPath(game.install_path);
        await updateExecutable(drive, game.title, filePath);
        const nextGames = games.map((entry) => (entry.install_path === game.install_path ? { ...entry, executable: filePath } : entry));
        setGames(nextGames);
        writeJson(LIBRARY_ALL_CACHE_KEY, nextGames);
      }
    } finally {
      setChangingExeTitle(null);
    }
  };

  const toggleShortcut = async (game: LibraryEntry) => {
    if (shortcutState[game.title]) {
      await removeShortcut(game.title).catch(() => {});
      const nextShortcuts = { ...shortcutState, [game.title]: false };
      setShortcutState(nextShortcuts);
      writeJson(SHORTCUT_ALL_CACHE_KEY, nextShortcuts);
      return;
    }
    await createShortcut(game.title, game.executable, game.executable);
    const nextShortcuts = { ...shortcutState, [game.title]: true };
    setShortcutState(nextShortcuts);
    writeJson(SHORTCUT_ALL_CACHE_KEY, nextShortcuts);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Hourglass size={56} className="text-slate-600" />
          <span className="text-sm text-slate-500 tracking-widest font-medium uppercase">Carregando...</span>
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Gamepad2 size={56} className="text-slate-600" />
          <span className="text-sm text-slate-500 tracking-widest font-medium uppercase">Nenhum Jogo Instalado</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto w-full p-10 custom-scrollbar flex flex-col gap-6">
      <LibraryToolbar count={filteredGames.length} isRefreshing={isRefreshing} search={search} onSearchChange={setSearch} />
      <DriveFilter drives={availableDrives} selected={selectedDrives} onToggle={toggleDrive} />

      {filteredGames.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <SearchX size={56} className="text-slate-600" />
            <span className="text-sm text-slate-500 tracking-widest font-medium uppercase">Nenhum jogo encontrado</span>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 w-full grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {filteredGames.map((game) => (
            <LibraryCard
              key={game.install_path}
              game={game}
              hasShortcut={shortcutState[game.title] ?? false}
              isConfirmingRemoval={pendingRemovalTitle === game.title}
              isPickingExe={changingExeTitle === game.title}
              onPlay={playGame}
              onOpenFolder={(g) => openPath(g.install_path, g.executable, false)}
              onChangeExe={changeExe}
              onToggleShortcut={toggleShortcut}
              onRequestRemove={setPendingRemovalTitle}
              onConfirmRemove={removeGame}
            />
          ))}
        </div>
      )}
    </div>
  );
}
