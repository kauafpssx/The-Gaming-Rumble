import { useState } from "react";
import { ChevronDown, Link2, ExternalLink } from "lucide-react";
import { type HosterLink } from "@/lib/games";
import { CollapsibleList } from "@/components/ui/collapsible-list";

function ensureProtocol(url: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  return `https://${url}`;
}

export function HosterSection({ hoster, links }: { hoster: string; links: HosterLink[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-1 bg-secondary/20 rounded-xl p-1.5 border border-border/40">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-secondary/40 rounded-lg transition-colors group"
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
              <a
                key={i}
                href={ensureProtocol(link.direct_link || link.u)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-secondary/40 hover:bg-secondary/60 border border-border/50 rounded-lg text-xs transition-colors group"
              >
                <Link2 className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="truncate flex-1">{link.file_name || link.n || `Link ${i + 1}`}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            )}
          />
        </div>
      )}
    </div>
  );
}
