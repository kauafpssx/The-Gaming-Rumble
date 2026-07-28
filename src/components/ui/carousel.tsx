import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDragScroll } from "@/hooks/use-drag-scroll";

/** Horizontal drag-to-scroll row with edge arrow buttons that dim out when there's nothing left to scroll. */
export function Carousel({
  children,
  className = "",
  gapClassName = "gap-2",
}: {
  children: React.ReactNode;
  className?: string;
  gapClassName?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const dragHandlers = useDragScroll(scrollRef);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => ro.disconnect();
  });

  const scrollByAmount = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={() => scrollByAmount(-1)}
        disabled={!canLeft}
        className="shrink-0 w-6 h-6 rounded-full bg-secondary/60 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <div
        ref={scrollRef}
        onScroll={updateArrows}
        {...dragHandlers}
        style={{ touchAction: "pan-y" }}
        className={`flex-1 min-w-0 flex ${gapClassName} overflow-x-auto scrollbar-none cursor-grab active:cursor-grabbing select-none`}
      >
        {children}
      </div>

      <button
        onClick={() => scrollByAmount(1)}
        disabled={!canRight}
        className="shrink-0 w-6 h-6 rounded-full bg-secondary/60 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
