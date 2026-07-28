import { useState } from "react";
import { KeyRound, Eye, EyeOff, Check } from "lucide-react";

export function ApiKeyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="bg-card border border-border/40 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound size={14} className="text-primary" />
        <p className="text-sm font-semibold text-foreground">X-Api-Key</p>
        <span className="text-xs text-muted-foreground/50">— aplicada em todos os requests desta página</span>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type={showKey ? "text" : "password"}
            className="w-full bg-background/60 border border-border/50 rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors pr-10"
            placeholder="sk-gr-..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <button
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {value && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-700/30 rounded-lg px-3">
            <Check size={12} />
            Ativa
          </div>
        )}
      </div>
    </div>
  );
}
