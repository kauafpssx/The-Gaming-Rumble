import { useEffect, useState, useCallback, useMemo } from "react";
import {
  X,
  Download,
  Calendar,
  HardDrive,
  Folder,
  Tag,
  Gamepad2,
  Rocket,
  Trophy,
  Shield,
  Share2,
  Check,
  Link2,
} from "lucide-react";
import { type Game } from "./GameCatalog";
import {
  makeProtocolUrl,
  toSlug,
  getGameDate,
  gameBannerUrl,
  screenshotUrl,
  movieThumbUrl,
  movieVideoUrl,
} from "@/lib/games";
import { Section } from "@/components/ui/section";
import { Chip } from "@/components/ui/chip";
import { CollapsibleList } from "@/components/ui/collapsible-list";
import { MediaGallery, type MediaItem } from "@/components/game-modal/media-gallery";
import { TagList } from "@/components/game-modal/tag-list";
import { AchievementsGrid } from "@/components/game-modal/achievements-grid";
import { HosterSection } from "@/components/game-modal/hoster-section";
import { RequirementsText } from "@/components/game-modal/requirements-text";

export function GameModal({ game, onClose }: { game: Game; onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/game/${toSlug(game.title)}?download`;

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl]);

  /* ── Lock body scroll ── */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* ── Page title reflects the open game ── */
  useEffect(() => {
    const prev = document.title;
    document.title = `${game.title} — Gaming Rumble`;
    return () => { document.title = prev; };
  }, [game.title]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleClose]);

  const req = game.steam?.pc_requirements;

  const media = useMemo(() => {
    const m: MediaItem[] = [];
    (game.steam?.movies ?? []).forEach((mv, i) => {
      if (mv.hls_h264) m.push({ type: "video", src: movieVideoUrl(game, i), poster: movieThumbUrl(game, i) });
    });
    (game.steam?.screenshots ?? []).forEach((_, i) => {
      m.push({ type: "image", src: screenshotUrl(game, i) });
    });
    return m;
  }, [game]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm ${
        closing ? "animate-backdrop-out" : "animate-backdrop-in"
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[88vh] shadow-2xl flex flex-col overflow-hidden ${
          closing ? "animate-scale-out" : "animate-scale-in"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          {/* Header image / background */}
          <div className="relative shrink-0 overflow-hidden">
            {game.steam?.header_image ? (
              <img
                src={gameBannerUrl(game)}
                alt={game.title}
                className="w-full h-52 object-cover object-center"
              />
            ) : (
              <div className="w-full h-52 bg-gradient-to-br from-primary/20 to-background" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors duration-150"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="p-6 space-y-5">
          {/* Title + chips */}
          <div>
            <h2 className="text-2xl font-bold mb-3">{game.title}</h2>
            <div className="flex flex-wrap gap-2">
              {getGameDate(game) && (
                <Chip icon={<Calendar className="w-3.5 h-3.5" />}>
                  {getGameDate(game)}
                </Chip>
              )}
              <Chip icon={<HardDrive className="w-3.5 h-3.5" />}>
                {game.fileSize}
              </Chip>
              <Chip icon={<Folder className="w-3.5 h-3.5" />}>
                {game.files?.length ?? 1} arquivo{(game.files?.length ?? 1) !== 1 ? "s" : ""}
              </Chip>
              {game.hoster_links && Object.keys(game.hoster_links).length > 0 && (
                <Chip icon={<Link2 className="w-3.5 h-3.5" />}>
                  {Object.keys(game.hoster_links).length} provider{Object.keys(game.hoster_links).length !== 1 ? "s" : ""}
                </Chip>
              )}
              {game.steam?.price_brl && (
                <Chip icon={<Tag className="w-3.5 h-3.5" />} highlight>
                  {game.steam.is_free ? "Grátis" : game.steam.price_brl}
                </Chip>
              )}
              {game.steam?.controller_support && (
                <Chip icon={<Gamepad2 className="w-3.5 h-3.5" />}>
                  Controle {game.steam.controller_support === "full" ? "total" : "parcial"}
                </Chip>
              )}
              {game.steam?.release_date_steam && (
                <Chip icon={<Rocket className="w-3.5 h-3.5" />}>
                  Lançamento: {game.steam.release_date_steam}
                </Chip>
              )}
              {!!game.steam?.achievements_total && (
                <Chip icon={<Trophy className="w-3.5 h-3.5" />}>
                  {game.steam.achievements_total} conquista{game.steam.achievements_total !== 1 ? "s" : ""}
                </Chip>
              )}
              {(game.steam?.ratings?.pegi || game.steam?.ratings?.esrb) && (
                <Chip icon={<Shield className="w-3.5 h-3.5" />}>
                  {[game.steam?.ratings?.pegi && `PEGI ${game.steam.ratings.pegi}`, game.steam?.ratings?.esrb && `ESRB ${game.steam.ratings.esrb}`]
                    .filter(Boolean)
                    .join(" · ")}
                </Chip>
              )}
            </div>

            {/* Tags (Genres + Categories) */}
            {(game.steam?.genres || game.steam?.categories) && (
              <TagList
                genres={game.steam.genres || []}
                categories={game.steam.categories || []}
              />
            )}
          </div>

          {/* Media gallery (screenshots + trailer) */}
          {media.length > 0 && (
            <Section title="Mídia">
              <MediaGallery media={media} alt={game.title} />
            </Section>
          )}

          {/* Description */}
          {game.steam?.short_description && (
            <Section title="Sobre o jogo">
              <p className="text-sm leading-relaxed">{game.steam.short_description}</p>
            </Section>
          )}

          {/* Achievements */}
          {!!game.steam?.achievements_highlighted?.length && (
            <Section title="Conquistas em destaque">
              <AchievementsGrid game={game} items={game.steam.achievements_highlighted} />
            </Section>
          )}

          {/* Requirements */}
          {(req?.minimum || req?.recommended) && (
            <Section title="Requisitos do sistema">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {req?.minimum && (
                  <div className="bg-secondary/40 rounded-xl p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                      Mínimos
                    </p>
                    <RequirementsText text={req.minimum} />
                  </div>
                )}
                {req?.recommended && (
                  <div className="bg-secondary/40 rounded-xl p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                      Recomendados
                    </p>
                    <RequirementsText text={req.recommended} />
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Files */}
          {game.files?.length > 0 && (
            <Section title="Arquivos incluídos">
              <CollapsibleList
                items={game.files}
                renderItem={(f, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-xs bg-secondary/30 rounded-lg px-3 py-2"
                  >
                    <span className="text-muted-foreground truncate mr-4">{f.name}</span>
                    <span className="shrink-0 font-medium">{f.size}</span>
                  </div>
                )}
              />
            </Section>
          )}

          {/* Hoster Links */}
          {game.hoster_links && Object.keys(game.hoster_links).length > 0 && (
            <Section title="Links de Download">
              <CollapsibleList
                items={Object.entries(game.hoster_links)}
                initialCount={6}
                renderItem={([hoster, links]) => (
                  <HosterSection key={hoster} hoster={hoster} links={links} />
                )}
              />
            </Section>
          )}
          </div>
        </div>

        {/* Download + Share — fixed, doesn't scroll with content */}
        <div className="shrink-0 flex gap-2 p-4 border-t border-border bg-card">
          <button
            onClick={() => { window.location.href = makeProtocolUrl(game); }}
            className="flex-1 px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:brightness-110 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Baixar no Gaming Rumble
          </button>
          <button
            onClick={handleShare}
            title="Copiar link de compartilhamento"
            className={`shrink-0 w-12 rounded-xl border transition-all duration-150 flex items-center justify-center active:scale-95 ${
              copied
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-secondary border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
