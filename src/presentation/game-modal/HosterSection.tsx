import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ChevronDown, ExternalLink, Link2 } from "lucide-react";

import type { CatalogHosterLink } from "@/domain/catalog";
import { CollapsibleList } from "@/components/ui/collapsible-list";

function ensureProtocol(url: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  return `https://${url}`;
}

export function HosterSection({ hoster, links }: { hoster: string; links: CatalogHosterLink[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-1 bg-secondary/20 rounded-xl p-1.5 border border-border/40">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-secondary/40 rounded-lg transition-colors group cursor-pointer"
      >
        <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-tighter group-hover:text-foreground transition-colors">
          {hoster} <span className="ml-1 opacity-50">({links.length})</span>
        </span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground/50 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      {isExpanded && (
        <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <CollapsibleList
            items={links}
            renderItem={(link, i) => (
              <button
                key={i}
                onClick={() => openUrl(ensureProtocol(link.directLink)).catch(() => {})}
                className="flex w-full items-center gap-2 px-3 py-2 bg-secondary/40 hover:bg-secondary/60 border border-border/50 rounded-lg text-xs transition-colors group cursor-pointer"
              >
                <Link2 className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="truncate flex-1 text-left">{link.fileName || `Link ${i + 1}`}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          />
        </div>
      )}
    </div>
  );
}
