import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { HlsVideo } from "./hls-video";
import { useDragScroll } from "@/hooks/use-drag-scroll";

export type MediaItem = { type: "video" | "image"; src: string; poster?: string };

export function MediaGallery({ media, alt }: { media: MediaItem[]; alt: string }) {
  const [active, setActive] = useState(0);
  const current = media[active];

  const stripRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dragHandlers = useDragScroll(stripRef);

  const selectMedia = (i: number) => {
    setActive(i);
    thumbRefs.current[i]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <>
      <div className="rounded-xl overflow-hidden border border-border bg-secondary/20 aspect-video">
        {current?.type === "video" ? (
          <HlsVideo key={current.src} src={current.src} poster={current.poster} />
        ) : (
          <img src={current?.src} alt={alt} loading="eager" className="w-full h-full object-cover" />
        )}
      </div>
      {media.length > 1 && (
        <div
          ref={stripRef}
          {...dragHandlers}
          style={{ touchAction: "pan-y" }}
          className="flex gap-2 mt-2 overflow-x-auto scrollbar-thin pb-1 cursor-grab active:cursor-grabbing select-none"
        >
          {media.map((m, i) => (
            <button
              key={i}
              ref={(el) => { thumbRefs.current[i] = el; }}
              onClick={() => selectMedia(i)}
              className={`relative shrink-0 w-24 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={m.type === "video" ? m.poster : m.src} alt="" loading="lazy" draggable={false} className="w-full h-full object-cover" />
              {m.type === "video" && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
