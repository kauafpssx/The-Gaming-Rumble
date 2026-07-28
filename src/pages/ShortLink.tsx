import { useEffect, useState, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { findByHash, findBySlug, makeProtocolUrl, type Game } from "@/lib/games";
import { NotFoundCard } from "@/pages/short-link/not-found-card";
import { GameBanner, GameMeta } from "@/pages/short-link/game-preview";
import { LoadingPanel, OpenedPanel, FallbackPanel } from "@/pages/short-link/state-panel";

type PageState = "loading" | "opened" | "fallback" | "error" | "not-found";

const ShortLink = () => {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<PageState>("loading");
  const [protocolUrl, setProtocolUrl] = useState<string>("");
  const [gameData, setGameData] = useState<Game | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: games, isLoading, isError } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const r = await fetch("/api/games");
      if (!r.ok) throw new Error("Failed to fetch games");
      return (await r.json()) as Game[];
    },
  });

  const tryOpenProtocol = useCallback((url: string) => {
    window.location.href = url;
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (isError || !games || !id) {
      setState("error");
      return;
    }

    // Try finding by hash first, then by slug
    const game = findByHash(games, id) || findBySlug(games, id);

    if (!game) {
      setState("not-found");
      return;
    }

    setGameData(game);

    // Build protocol URL
    const url = makeProtocolUrl(game);
    setProtocolUrl(url);
    tryOpenProtocol(url);

    let didOpen = false;
    const fallbackTimer = setTimeout(() => {
      if (!didOpen) setState("fallback");
    }, 1500);

    const markOpened = () => {
      if (!didOpen) {
        didOpen = true;
        clearTimeout(fallbackTimer);
        setState("opened");
      }
    };

    const handleVisibility = () => { if (document.hidden) markOpened(); };
    const handleBlur = () => markOpened();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      clearTimeout(fallbackTimer);
    };
  }, [id, games, isLoading, isError, tryOpenProtocol]);

  // Auto-close tab after 5s on success
  useEffect(() => {
    if (state !== "opened") return;
    const timer = setTimeout(() => { window.close(); }, 5000);
    return () => clearTimeout(timer);
  }, [state]);

  const copyMagnet = useCallback(() => {
    if (!gameData?.magnet) return;
    navigator.clipboard.writeText(gameData.magnet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [gameData]);

  if (state === "error") {
    return <Navigate to="/page/1" replace />;
  }

  if (state === "not-found") {
    return <NotFoundCard />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="animate-fade-in-up bg-card border border-border rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {gameData && <GameBanner game={gameData} />}

        <div className="p-6 md:p-8">
          {gameData && <GameMeta game={gameData} />}

          {state === "loading" && <LoadingPanel />}
          {state === "opened" && <OpenedPanel />}
          {state === "fallback" && (
            <FallbackPanel onOpenProtocol={() => tryOpenProtocol(protocolUrl)} onCopyMagnet={copyMagnet} copied={copied} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ShortLink;
