import { KeyRound } from "lucide-react";

export function RateLimitCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="bg-card border border-border/40 rounded-xl p-4 space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Sem API Key</p>
        <p className="text-2xl font-bold text-foreground">60</p>
        <p className="text-xs text-muted-foreground">requisições / minuto</p>
      </div>
      <div className="bg-card border border-primary/20 rounded-xl p-4 space-y-1">
        <p className="text-xs text-primary uppercase tracking-wider flex items-center gap-1.5"><KeyRound size={11} /> Com X-Api-Key</p>
        <p className="text-2xl font-bold text-primary">300</p>
        <p className="text-xs text-muted-foreground">requisições / minuto</p>
      </div>
      <div className="bg-card border border-border/40 rounded-xl p-4 space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">POST /api/encode</p>
        <p className="text-2xl font-bold text-amber-400">10 <span className="text-base font-normal text-muted-foreground">/ 60</span></p>
        <p className="text-xs text-muted-foreground">sem key / com key</p>
      </div>
    </div>
  );
}
