import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { motion } from "framer-motion";
import { Icon } from "../Icon";
import { Tooltip } from "../Tooltip";

export interface LibraryEntry {
  title: string;
  install_path: string;
  executable: string;
  banner: string;
  size_gb: number;
  play_time_ms: number;
}

type LibraryEntryUpdatedEvent = {
  drive: string;
  entry: LibraryEntry;
};

type ViewMode = "list" | "grid";

const VIEW_MODE_KEY = "gr_library_view_mode";
const SEARCH_KEY = "gr_library_search";
const LIBRARY_CACHE_PREFIX = "gr_library_cache::";
const SHORTCUT_CACHE_PREFIX = "gr_shortcut_cache::";

function getLibraryCacheKey(drive: string) {
  return `${LIBRARY_CACHE_PREFIX}${drive}`;
}

function getShortcutCacheKey(drive: string) {
  return `${SHORTCUT_CACHE_PREFIX}${drive}`;
}

function formatPlaytime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h${minutes}m${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m${seconds}s`;
  }

  return `${seconds}s`;
}

export function LibraryView({ defaultDrive }: { defaultDrive: string }) {
  const [games, setGames] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRemovalTitle, setPendingRemovalTitle] = useState<string | null>(null);
  const [shortcutState, setShortcutState] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [changingExeTitle, setChangingExeTitle] = useState<string | null>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem(SEARCH_KEY) ?? "");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return saved === "grid" ? "grid" : "list";
  });

  const patchLibraryEntry = (entry: LibraryEntry) => {
    setGames((prev) => {
      const next = prev.map((game) => (game.title === entry.title ? { ...game, ...entry } : game));
      localStorage.setItem(getLibraryCacheKey(defaultDrive), JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (searchQuery) {
      setSearchExpanded(true);
    }
    localStorage.setItem(SEARCH_KEY, searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!defaultDrive) return;

    const cachedGamesRaw = localStorage.getItem(getLibraryCacheKey(defaultDrive));
    const cachedShortcutsRaw = localStorage.getItem(getShortcutCacheKey(defaultDrive));

    if (cachedGamesRaw) {
      try {
        const parsedGames = JSON.parse(cachedGamesRaw) as LibraryEntry[];
        setGames(parsedGames);
        setLoading(false);
      } catch {
        localStorage.removeItem(getLibraryCacheKey(defaultDrive));
      }
    } else {
      setLoading(true);
    }

    if (cachedShortcutsRaw) {
      try {
        setShortcutState(JSON.parse(cachedShortcutsRaw) as Record<string, boolean>);
      } catch {
        localStorage.removeItem(getShortcutCacheKey(defaultDrive));
      }
    }

    let cancelled = false;

    const loadLibrary = async () => {
      setIsRefreshing(true);
      try {
        const nextGames = await invoke<LibraryEntry[]>("get_library", { drive: defaultDrive });
        if (cancelled) return;

        const safeGames = nextGames || [];
        setGames(safeGames);
        localStorage.setItem(getLibraryCacheKey(defaultDrive), JSON.stringify(safeGames));

        const nextShortcutState = safeGames.length > 0
          ? await invoke<Record<string, boolean>>("get_shortcut_states", { titles: safeGames.map((game) => game.title) }).catch(() => ({}))
          : {};

        if (cancelled) return;
        setShortcutState(nextShortcutState);
        localStorage.setItem(getShortcutCacheKey(defaultDrive), JSON.stringify(nextShortcutState));
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void loadLibrary();

    return () => {
      cancelled = true;
    };
  }, [defaultDrive]);

  useEffect(() => {
    let cancelled = false;
    let cleanup: null | (() => void) = null;

    const attachLibraryEntryListener = async () => {
      const unlisten = await listen<LibraryEntryUpdatedEvent>("library-entry-updated", (event) => {
        if (cancelled || event.payload.drive !== defaultDrive) return;
        patchLibraryEntry(event.payload.entry);
      });

      if (cancelled) {
        unlisten();
        return;
      }

      cleanup = unlisten;
    };

    void attachLibraryEntryListener();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [defaultDrive]);

  const filteredGames = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return games;

    return games.filter((game) => {
      const exeName = game.executable ? game.executable.split("\\").pop()?.toLowerCase() ?? "" : "";
      return game.title.toLowerCase().includes(query) || exeName.includes(query);
    });
  }, [games, searchQuery]);

  const removeGame = async (game: LibraryEntry) => {
    setPendingRemovalTitle(null);
    const nextGames = games.filter((g) => g.title !== game.title);
    setGames(nextGames);
    localStorage.setItem(getLibraryCacheKey(defaultDrive), JSON.stringify(nextGames));

    const nextShortcuts = { ...shortcutState };
    delete nextShortcuts[game.title];
    setShortcutState(nextShortcuts);
    localStorage.setItem(getShortcutCacheKey(defaultDrive), JSON.stringify(nextShortcuts));

    await invoke("stop_torrent").catch(() => {});
    await invoke("delete_folder", { path: game.install_path }).catch(console.error);
    await invoke("remove_shortcut", { title: game.title }).catch(() => {});
    await invoke("remove_from_library", { drive: defaultDrive, title: game.title }).catch(console.error);
  };

  const playGame = async (game: LibraryEntry) => {
    if (!game.executable) {
      alert("Executavel nao encontrado. O jogo pode nao ter sido extraido corretamente.");
      return;
    }
    await invoke("launch_and_track_game", {
      drive: defaultDrive,
      title: game.title,
      executable: game.executable,
      installPath: game.install_path,
    }).catch((e) => alert(`Erro ao iniciar jogo: ${e}`));
  };

  const openFolder = async (installPath: string, executable: string) => {
    await invoke("open_path", { path: installPath, selectFile: executable, preferSelect: false });
  };

  const changeExe = async (game: LibraryEntry) => {
    if (changingExeTitle) return;

    setChangingExeTitle(game.title);
    try {
      const filePath: string | null = await invoke("show_exe_picker", { defaultPath: game.install_path });
      if (filePath && typeof filePath === "string") {
        await invoke("update_executable", { drive: defaultDrive, title: game.title, executable: filePath });

        const nextGames = games.map((entry) =>
          entry.title === game.title ? { ...entry, executable: filePath } : entry
        );
        setGames(nextGames);
        localStorage.setItem(getLibraryCacheKey(defaultDrive), JSON.stringify(nextGames));
      }
    } finally {
      setChangingExeTitle(null);
    }
  };

  const createShortcut = async (game: LibraryEntry) => {
    await invoke("create_shortcut", { title: game.title, executable: game.executable, icon: game.executable });
    const nextShortcuts = { ...shortcutState, [game.title]: true };
    setShortcutState(nextShortcuts);
    localStorage.setItem(getShortcutCacheKey(defaultDrive), JSON.stringify(nextShortcuts));
  };

  const toggleShortcut = async (game: LibraryEntry) => {
    if (shortcutState[game.title]) {
      await invoke("remove_shortcut", { title: game.title }).catch(() => {});
      const nextShortcuts = { ...shortcutState, [game.title]: false };
      setShortcutState(nextShortcuts);
      localStorage.setItem(getShortcutCacheKey(defaultDrive), JSON.stringify(nextShortcuts));
      return;
    }

    await createShortcut(game);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0e0e10]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Icon name="hourglass_empty" size={64} className="text-slate-600" />
          <span className="text-sm text-slate-500 tracking-widest font-medium uppercase">Carregando...</span>
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0e0e10]">
        <div className="flex flex-col items-center gap-4">
          <Icon name="sports_esports" size={64} className="text-slate-600" />
          <span className="text-sm text-slate-500 tracking-widest font-medium uppercase">Nenhum Jogo Baixado</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto w-full p-12 pr-6 custom-scrollbar flex flex-col gap-8 pb-32">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-3xl font-black text-white/90 tracking-tighter uppercase tabular-nums whitespace-nowrap">
            Sua Coleção <span className="text-[#a4e6ff] text-xl ml-2">({filteredGames.length})</span>
          </h2>
          {isRefreshing && <span className="text-[9px] uppercase tracking-[0.3em] text-slate-600">Atualizando</span>}
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0">
          <Tooltip content="Visualizacao em lista">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`h-11 w-11 rounded-2xl border transition-all flex items-center justify-center cursor-pointer ${
              viewMode === "list"
                ? "border-[#a4e6ff]/25 bg-[#a4e6ff]/10 text-[#a4e6ff]"
                : "border-white/5 bg-white/[0.02] text-slate-500 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <Icon name="view_agenda" size={18} />
          </button>
          </Tooltip>

          <Tooltip content="Visualizacao em grade">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`h-11 w-11 rounded-2xl border transition-all flex items-center justify-center cursor-pointer ${
              viewMode === "grid"
                ? "border-[#a4e6ff]/25 bg-[#a4e6ff]/10 text-[#a4e6ff]"
                : "border-white/5 bg-white/[0.02] text-slate-500 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <Icon name="view_week" size={18} />
          </button>
          </Tooltip>

          <motion.div
            animate={{ width: searchExpanded ? 240 : 44 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="h-11 rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden"
          >
            <div className="h-full flex items-center">
              <Tooltip content="Pesquisar jogos">
              <button
                type="button"
                onClick={() => setSearchExpanded(true)}
                className="h-11 w-11 flex items-center justify-center text-slate-500 hover:text-[#a4e6ff] transition-colors cursor-pointer shrink-0"
              >
                <Icon name="search" size={18} />
              </button>
              </Tooltip>
              {searchExpanded && (
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onBlur={() => {
                    if (!searchQuery.trim()) {
                      setSearchExpanded(false);
                    }
                  }}
                  placeholder="Pesquisar..."
                  className="h-full flex-1 bg-transparent border-none outline-none text-sm text-white/85 pr-4"
                />
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {filteredGames.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-[#0e0e10]">
          <div className="flex flex-col items-center gap-4">
            <Icon name="search_off" size={64} className="text-slate-600" />
            <span className="text-sm text-slate-500 tracking-widest font-medium uppercase">Nenhum jogo encontrado</span>
          </div>
        </div>
      ) : (
        <div className={`grid gap-6 w-full ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
          {filteredGames.map((game) => {
            const isConfirmingRemoval = pendingRemovalTitle === game.title;
            const hasShortcut = shortcutState[game.title] ?? false;
            const isPickingExe = changingExeTitle === game.title;
            const compact = viewMode === "grid";

            return (
              <div
                key={game.title}
                className={`relative group bg-[#111113] rounded-2xl overflow-hidden border border-white/5 flex flex-col hover:border-white/10 transition-all duration-300 ${
                  compact ? "min-h-[356px]" : ""
                }`}
              >
                <div className={`${compact ? "h-32" : "h-40"} w-full overflow-hidden relative`}>
                  <img src={game.banner} alt={game.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111113] to-transparent pointer-events-none" />
                  <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] pointer-events-none" />
                </div>

                <div className="p-6 relative z-10 flex-col flex flex-1 bg-gradient-to-b from-[#111113] to-[#0a0a0a]">
                  <h3 className="text-xl font-bold text-white/90 uppercase tracking-wide truncate">{game.title}</h3>
                  <div className="mt-2 flex items-center gap-4 text-xs font-mono text-slate-500 tracking-wider min-w-0">
                    <span className="flex items-center gap-1.5"><Icon name="folder" size={14} /> {(game.size_gb || 0).toFixed(1)} GB</span>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 min-w-0 flex-1">
                        <Icon name="terminal" size={14} className="shrink-0" />
                        <span className="truncate">{game.executable ? game.executable.split("\\").pop() : "N/A"}</span>
                      </span>
                      <span className="shrink-0 text-[11px] tracking-[0.16em] text-[#a4e6ff]/80">
                        {formatPlaytime(game.play_time_ms)}
                      </span>
                    </div>
                  </div>

                  {compact ? (
                    <>
                      <div className="mt-5 flex items-center gap-3">
                        <Tooltip content="Abrir pasta" wrapperClassName="flex-1">
                        <button
                          onClick={() => openFolder(game.install_path, game.executable)}
                          className="h-11 flex-1 bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all group/folder border border-white/5 cursor-pointer"
                        >
                          <Icon name="folder_open" size={18} className="group-hover/folder:scale-110 transition-transform" />
                        </button>
                        </Tooltip>

                        <Tooltip content="Trocar executavel" disabled={isPickingExe} wrapperClassName="flex-1">
                        <button
                          onClick={() => changeExe(game)}
                          disabled={isPickingExe}
                          className="h-11 flex-1 bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all group/exe border border-white/5 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                        >
                          <Icon name={isPickingExe ? "hourglass_top" : "terminal"} size={18} className="group-hover/exe:scale-110 transition-transform" />
                        </button>
                        </Tooltip>

                        <Tooltip content={hasShortcut ? "Remover atalho" : "Criar atalho"} wrapperClassName="flex-1">
                        <button
                          onClick={() => toggleShortcut(game)}
                          className={`h-11 flex-1 rounded-xl flex items-center justify-center transition-all group/shortcut border cursor-pointer ${
                            hasShortcut
                              ? "bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 border-red-500/20"
                              : "bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white border-white/5"
                          }`}
                        >
                          <Icon name="app_shortcut" size={18} className="group-hover/shortcut:scale-110 transition-transform" />
                        </button>
                        </Tooltip>

                        <motion.div
                          animate={{ width: isConfirmingRemoval ? 128 : 44 }}
                          transition={{ type: "spring", stiffness: 320, damping: 26 }}
                          className={`h-11 shrink-0 rounded-xl border overflow-hidden ${
                            isConfirmingRemoval
                              ? "bg-red-500/10 text-red-100 border-red-500/30"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          }`}
                        >
                          {isConfirmingRemoval ? (
                            <div className="h-full flex items-center justify-center gap-2 px-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/15 text-red-300 shrink-0">
                                <Icon name="delete" size={15} />
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Tooltip content="Confirmar exclusao">
                                <button
                                  onClick={() => removeGame(game)}
                                  className="h-8 w-8 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-400 transition-colors cursor-pointer"
                                >
                                  <Icon name="check" size={16} />
                                </button>
                                </Tooltip>
                                <Tooltip content="Cancelar exclusao">
                                <button
                                  onClick={() => setPendingRemovalTitle(null)}
                                  className="h-8 w-8 rounded-lg bg-white/10 text-red-100 flex items-center justify-center hover:bg-white/15 transition-colors cursor-pointer"
                                >
                                  <Icon name="close" size={16} />
                                </button>
                                </Tooltip>
                              </div>
                            </div>
                          ) : (
                            <Tooltip content="Desinstalar">
                            <button
                              onClick={() => setPendingRemovalTitle(game.title)}
                              className="h-full w-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all group/del cursor-pointer"
                            >
                              <Icon name="delete" size={18} className="group-hover/del:scale-110 transition-transform" />
                            </button>
                            </Tooltip>
                          )}
                        </motion.div>
                      </div>

                      <button
                        onClick={() => playGame(game)}
                        className="mt-3 h-12 bg-[#a4e6ff]/10 hover:bg-[#a4e6ff]/20 text-[#a4e6ff] hover:text-white rounded-xl px-4 font-bold tracking-widest text-xs uppercase flex items-center justify-center gap-3 transition-colors overflow-hidden relative group/btn border border-[#a4e6ff]/20 cursor-pointer"
                      >
                        <Icon name="play_arrow" size={16} className="relative z-10" />
                        <span className="relative z-10 drop-shadow-md">Iniciar</span>
                        <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-10 bg-gradient-to-r from-transparent via-[#a4e6ff] to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1s_infinite]" />
                      </button>
                    </>
                  ) : (
                    <div className="mt-8 flex items-center gap-3">
                      <button
                        onClick={() => playGame(game)}
                        className="flex-1 h-12 bg-[#a4e6ff]/10 hover:bg-[#a4e6ff]/20 text-[#a4e6ff] hover:text-white rounded-xl px-4 font-bold tracking-widest text-xs uppercase flex items-center justify-center gap-3 transition-colors overflow-hidden relative group/btn border border-[#a4e6ff]/20 cursor-pointer"
                      >
                        <Icon name="play_arrow" size={16} className="relative z-10" />
                        <span className="relative z-10 drop-shadow-md">Iniciar</span>
                        <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-10 bg-gradient-to-r from-transparent via-[#a4e6ff] to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1s_infinite]" />
                      </button>

                      <Tooltip content="Abrir pasta">
                      <button
                        onClick={() => openFolder(game.install_path, game.executable)}
                        className="h-12 w-12 shrink-0 bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all group/folder border border-white/5 cursor-pointer"
                      >
                        <Icon name="folder_open" size={18} className="group-hover/folder:scale-110 transition-transform" />
                      </button>
                      </Tooltip>

                      <Tooltip content="Trocar executavel" disabled={isPickingExe}>
                      <button
                        onClick={() => changeExe(game)}
                        disabled={isPickingExe}
                        className="h-12 w-12 shrink-0 bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all group/exe border border-white/5 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                      >
                        <Icon name={isPickingExe ? "hourglass_top" : "terminal"} size={18} className="group-hover/exe:scale-110 transition-transform" />
                      </button>
                      </Tooltip>

                      <Tooltip content={hasShortcut ? "Remover atalho" : "Criar atalho"}>
                      <button
                        onClick={() => toggleShortcut(game)}
                        className={`h-12 w-12 shrink-0 rounded-xl flex items-center justify-center transition-all group/shortcut border cursor-pointer ${
                          hasShortcut
                            ? "bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 border-red-500/20"
                            : "bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white border-white/5"
                        }`}
                      >
                        <Icon name="app_shortcut" size={18} className="group-hover/shortcut:scale-110 transition-transform" />
                      </button>
                      </Tooltip>

                      <motion.div
                        animate={{ width: isConfirmingRemoval ? 288 : 48 }}
                        transition={{ type: "spring", stiffness: 320, damping: 26 }}
                        className={`h-12 shrink-0 rounded-xl border overflow-hidden ${
                          isConfirmingRemoval
                            ? "bg-red-500/10 text-red-100 border-red-500/30"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        }`}
                      >
                        {isConfirmingRemoval ? (
                          <div className="h-full grid grid-cols-[1fr_auto] items-center gap-4 px-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon name="delete" size={18} className="text-red-400 shrink-0" />
                              <span className="text-[11px] font-bold tracking-[0.1em] uppercase whitespace-nowrap">Desinstalar?</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => removeGame(game)}
                                className="h-8 min-w-[52px] px-3 rounded-lg bg-red-500 text-white text-[10px] font-bold tracking-[0.12em] uppercase hover:bg-red-400 transition-colors cursor-pointer"
                              >
                                Sim
                              </button>
                              <button
                                onClick={() => setPendingRemovalTitle(null)}
                                className="h-8 min-w-[52px] px-3 rounded-lg bg-white/10 text-red-100 text-[10px] font-bold tracking-[0.12em] uppercase hover:bg-white/15 transition-colors cursor-pointer"
                              >
                                Nao
                              </button>
                            </div>
                          </div>
                        ) : (
                          <Tooltip content="Desinstalar">
                          <button
                            onClick={() => setPendingRemovalTitle(game.title)}
                            className="h-full w-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-all group/del cursor-pointer"
                          >
                            <Icon name="delete" size={18} className="group-hover/del:scale-110 transition-transform" />
                          </button>
                          </Tooltip>
                        )}
                      </motion.div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
