import { Dices } from "lucide-react";
import { type GameStats } from "@/lib/games";

export function StatusFooter({
  stats,
  hidden,
  onRandom,
}: {
  stats: GameStats;
  hidden: boolean;
  onRandom: () => void;
}) {
  return (
    <footer
      className={`fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 transition-all duration-500 ease-in-out ${
        hidden ? "translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-card/90 backdrop-blur-md border border-border rounded-2xl shadow-2xl shadow-black/50 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={onRandom}
            title="Jogo aleatório"
            className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors"
          >
            <Dices className="w-3.5 h-3.5" />
            <span className="font-medium uppercase tracking-wider">Surpreenda-me</span>
          </button>
          <div className="hidden md:flex items-center gap-3 border-l border-border pl-4">
            <span>Torrents: <span className="text-foreground/70">{stats.online_fix_total}</span></span>
            <span>Steam Sync: <span className="text-foreground/70">{stats.steam_with_metadata}</span></span>
          </div>
        </div>

        <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
          Última Sincronização: <span className="text-foreground/70">{stats.last_scrape_at_display}</span>
          <span className="mx-2 opacity-30">|</span>
          Build: <span className="text-foreground/70">{stats.generated_at_display}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden md:inline">Saúde do Banco: <span className="text-foreground/70">{stats.match_rate}%</span></span>
          <div className="w-12 h-1 bg-secondary rounded-full overflow-hidden hidden md:block">
            <div className="h-full bg-primary/60" style={{ width: `${stats.match_rate}%` }} />
          </div>
          <a
            href="/api"
            className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-border/60 bg-primary/10 text-primary/70 hover:text-primary hover:bg-primary/20 transition-colors text-[9px] uppercase tracking-wider font-medium"
          >
            API
          </a>
        </div>
      </div>
    </footer>
  );
}
