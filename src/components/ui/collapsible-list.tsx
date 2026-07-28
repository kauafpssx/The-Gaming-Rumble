import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function CollapsibleList<T>({
  items,
  renderItem,
  initialCount = 5,
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  initialCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const showButton = items.length > initialCount;
  const visibleItems = expanded ? items : items.slice(0, initialCount);

  return (
    <div className="space-y-1">
      {visibleItems.map(renderItem)}
      {showButton && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1.5 bg-primary/5 rounded-lg border border-primary/10 mt-1"
        >
          {expanded ? "Ver menos" : `Ver mais (${items.length - initialCount})`}
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}
