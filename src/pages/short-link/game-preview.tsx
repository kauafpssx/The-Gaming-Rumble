import { gameImageUrl, type Game } from "@/lib/games";

export function GameBanner({ game }: { game: Game }) {
  return (
    <div className="relative w-full">
      <img
        src={gameImageUrl(game)}
        alt={game.title}
        className="w-full h-40 md:h-48 object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
          (e.target as HTMLImageElement).parentElement?.classList.add("bg-gradient-to-br", "from-primary/20", "to-background");
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
        <div className="absolute bottom-3 left-4 right-4">
          <h1 className="text-lg md:text-xl font-bold text-white drop-shadow-lg leading-tight">{game.title}</h1>
        </div>
      </div>
    </div>
  );
}

export function GameMeta({ game }: { game: Game }) {
  return (
    <>
      <div className="flex justify-center gap-6 text-sm text-muted-foreground mb-4">
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          {game.fileSize}
        </span>
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          {game.files?.length ?? 1} {game.files?.length === 1 ? "arquivo" : "arquivos"}
        </span>
        {game.hoster_links && Object.keys(game.hoster_links).length > 0 && (
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            {Object.keys(game.hoster_links).length} {Object.keys(game.hoster_links).length === 1 ? "provider" : "providers"}
          </span>
        )}
      </div>

      {/* Tags (Genres + Categories) */}
      {(game.steam?.genres || game.steam?.categories) && (
        <div className="flex flex-wrap justify-center gap-1 mb-6">
          {game.steam.genres?.slice(0, 4).map((g) => (
            <span key={g.id} className="text-[9px] px-1.5 py-0.5 rounded-md bg-secondary/30 text-muted-foreground border border-border/30">
              {g.description}
            </span>
          ))}
          {game.steam.categories?.slice(0, 4).map((c) => (
            <span key={c.id} className="text-[9px] px-1.5 py-0.5 rounded-md bg-primary/5 text-primary/60 border border-primary/10">
              {c.description}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
