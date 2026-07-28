import { Gauge, Send } from "lucide-react";
import { type RouteDefinition, METHOD_STYLES, CATEGORY_ACCENT } from "./routes";
import { RoutePath } from "./route-path";

export function RouteCard({
  route,
  accentColor,
  onTry,
}: {
  route: RouteDefinition;
  accentColor: string;
  onTry: () => void;
}) {
  return (
    <div className="group flex items-center gap-4 bg-card/50 hover:bg-card border border-border/30 hover:border-border/60 rounded-xl px-4 py-3 transition-all duration-200">
      <span className={`text-xs font-bold font-mono px-2 py-1 rounded shrink-0 ${METHOD_STYLES[route.method]}`}>
        {route.method}
      </span>

      <div className="flex-1 min-w-0">
        <code className="text-sm font-mono text-foreground/90">
          <RoutePath path={route.path} />
        </code>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{route.description}</p>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        {route.rateLimit && (
          <span className="text-xs flex items-center gap-1 text-muted-foreground/50 border border-border/30 px-1.5 py-0.5 rounded">
            <Gauge size={10} />
            {route.rateLimit}/m
          </span>
        )}
        {route.params.map((p) => (
          <span
            key={p.name}
            className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border/30"
          >
            {p.type === "path" ? ":" : "?"}
            {p.name}
          </span>
        ))}
      </div>

      <button
        onClick={onTry}
        className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 opacity-0 group-hover:opacity-100 ${CATEGORY_ACCENT[accentColor]}`}
      >
        <Send size={11} />
        Try
      </button>
    </div>
  );
}
