import { useMemo } from "react";

import { Carousel } from "@/components/ui/carousel";

export function TagList({ genres, categories }: { genres: string[]; categories: string[] }) {
  const allTags = useMemo(
    () => [
      ...genres.map((description) => ({ description, type: "genre" as const })),
      ...categories.map((description) => ({ description, type: "category" as const })),
    ],
    [genres, categories]
  );

  if (allTags.length === 0) return null;

  return (
    <div className="mt-3">
      <Carousel gapClassName="gap-1.5">
        {allTags.map((tag, i) => (
          <span
            key={`${tag.type}-${i}`}
            className={`shrink-0 inline-flex items-center leading-none whitespace-nowrap text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
              tag.type === "genre" ? "bg-secondary/40 text-muted-foreground border-border/40" : "bg-primary/10 text-primary/80 border-primary/20"
            }`}
          >
            {tag.description}
          </span>
        ))}
      </Carousel>
    </div>
  );
}
