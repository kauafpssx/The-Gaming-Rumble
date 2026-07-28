import { useState } from "react";
import { ChevronUp, Download } from "lucide-react";
import { type Game, gameImageUrl, makeProtocolUrl } from "@/lib/games";

export function GameCard({
  game,
  index,
  status,
  onExpand,
}: {
  game: Game;
  index: number;
  status?: "new" | "upd";
  onExpand: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  const download = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = makeProtocolUrl(game);
  };

  return (
    <div
      className="animate-card-in bg-card border border-border rounded-xl overflow-hidden flex flex-col group hover:border-primary/50 transition-colors hover:shadow-lg hover:shadow-primary/10"
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
    >
      {/* Banner — clicável para abrir modal */}
      <div
        className="relative w-full h-28 bg-secondary overflow-hidden cursor-pointer"
        onClick={onExpand}
      >
        {!imgError && game.steam?.header_image ? (
          <img
            src={gameImageUrl(game)}
            alt={game.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-background flex items-center justify-center p-2">
            <span className="text-xs text-muted-foreground text-center line-clamp-3 leading-tight">
              {game.title}
            </span>
          </div>
        )}

        {/* Status Badge */}
        {status && (
          <div className={`absolute top-0 left-0 px-1.5 py-0.5 text-[8px] font-bold text-white uppercase rounded-br-lg shadow-lg z-10 ${
            status === "new" ? "bg-emerald-500/90" : "bg-blue-500/90"
          }`}>
            {status === "new" ? "Novo" : "Upd"}
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
        {/* Expand hint icon */}
        <div className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ChevronUp className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <h3 className="text-sm font-semibold leading-tight line-clamp-2">{game.title}</h3>
        {game.steam?.short_description && (
          <p className="text-xs text-muted-foreground line-clamp-2 flex-1 leading-relaxed">
            {game.steam.short_description}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto pt-1.5">
          <span className="text-xs text-muted-foreground">{game.fileSize}</span>
          <button
            onClick={download}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 active:scale-95 transition-all duration-150"
          >
            <Download className="w-3 h-3" />
            Baixar
          </button>
        </div>
      </div>
    </div>
  );
}
