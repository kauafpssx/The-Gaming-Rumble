import { useMemo } from "react";

import type { CatalogEntry } from "@/domain/catalog";
import { CollapsibleList } from "@/components/ui/collapsible-list";
import { Section } from "@/components/ui/section";

import { AchievementsGrid } from "./AchievementsGrid";
import { HosterSection } from "./HosterSection";
import { MediaGallery, type MediaItem } from "./MediaGallery";
import { RequirementsText } from "./RequirementsText";
import { TagList } from "./TagList";

/** Rich body of the game modal — only rendered for full catalog entries. */
export function GameDetailInfo({ game }: { game: CatalogEntry }) {
  const media = useMemo(() => {
    const items: MediaItem[] = [];
    game.movies.forEach((movie) => {
      if (movie.hlsUrl) items.push({ type: "video", src: movie.hlsUrl, poster: movie.thumbnail });
    });
    game.screenshots.forEach((src) => items.push({ type: "image", src }));
    return items;
  }, [game]);

  const hosterEntries = Object.entries(game.hosterLinks);

  return (
    <div className="space-y-5">
      <TagList genres={game.genres} categories={game.categories} />

      {media.length > 0 && (
        <Section title="Mídia">
          <MediaGallery media={media} alt={game.title} />
        </Section>
      )}

      {game.description && (
        <Section title="Sobre o jogo">
          <p className="text-sm leading-relaxed">{game.description}</p>
        </Section>
      )}

      {game.achievements.length > 0 && (
        <Section title="Conquistas em destaque">
          <AchievementsGrid steamAppId={game.steamAppId} items={game.achievements} />
        </Section>
      )}

      {(game.requirementsMinimum || game.requirementsRecommended) && (
        <Section title="Requisitos do sistema">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {game.requirementsMinimum && (
              <div className="bg-secondary/40 rounded-xl p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Mínimos</p>
                <RequirementsText text={game.requirementsMinimum} />
              </div>
            )}
            {game.requirementsRecommended && (
              <div className="bg-secondary/40 rounded-xl p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Recomendados</p>
                <RequirementsText text={game.requirementsRecommended} />
              </div>
            )}
          </div>
        </Section>
      )}

      {game.files.length > 0 && (
        <Section title="Arquivos incluídos">
          <CollapsibleList
            items={game.files}
            renderItem={(f, i) => (
              <div key={i} className="flex justify-between text-xs bg-secondary/30 rounded-lg px-3 py-2">
                <span className="text-muted-foreground truncate mr-4">{f.name}</span>
                <span className="shrink-0 font-medium">{f.size}</span>
              </div>
            )}
          />
        </Section>
      )}

      {hosterEntries.length > 0 && (
        <Section title="Links de Download">
          <CollapsibleList
            items={hosterEntries}
            initialCount={6}
            renderItem={([hoster, links]) => <HosterSection key={hoster} hoster={hoster} links={links} />}
          />
        </Section>
      )}
    </div>
  );
}
