import { type Game } from "../GameCatalog";
import { achievementIconUrl } from "@/lib/games";
import { Carousel } from "@/components/ui/carousel";

export function AchievementsGrid({
  game,
  items,
}: {
  game: Game;
  items: { name: string; path: string; localized_name?: string }[];
}) {
  if (items.length === 0) return null;

  return (
    <Carousel gapClassName="gap-1.5">
      {items.map((a, i) => (
        <span
          key={i}
          className="shrink-0 inline-flex items-center gap-1.5 leading-none whitespace-nowrap text-[10px] pl-1 pr-2.5 py-1 rounded-full border bg-secondary/30 text-muted-foreground/80 border-border/40"
        >
          <img src={achievementIconUrl(game, i)} alt="" loading="lazy" draggable={false} className="w-4 h-4 rounded-sm shrink-0" />
          {a.localized_name ?? a.name}
        </span>
      ))}
    </Carousel>
  );
}
