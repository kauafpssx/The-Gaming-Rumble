import { type Game, type GameStats } from "@/lib/games";
import { GameCard } from "./game-card";

export function GameGrid({
  games,
  stats,
  gridKey,
  onExpand,
}: {
  games: Game[];
  stats: GameStats | undefined;
  gridKey: string;
  onExpand: (game: Game) => void;
}) {
  if (games.length === 0) {
    return (
      <div className="text-center py-24 text-muted-foreground animate-fade-in-up">
        Nenhum jogo encontrado.
      </div>
    );
  }

  return (
    <div
      key={gridKey}
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 3xl:grid-cols-10 gap-3 md:gap-4"
    >
      {games.map((game, i) => {
        const isNew = stats?.latest_run_new_game_names?.includes(game.title);
        const isUpd = stats?.latest_run_updated_game_names?.includes(game.title);
        return (
          <GameCard
            key={game.unique_hash || game.title}
            game={game}
            index={i}
            status={isNew ? "new" : isUpd ? "upd" : undefined}
            onExpand={() => onExpand(game)}
          />
        );
      })}
    </div>
  );
}
