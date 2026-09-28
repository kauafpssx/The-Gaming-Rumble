import { HardDrive } from "lucide-react";

import { cn } from "@/lib/utils";

interface DriveFilterProps {
  drives: string[];
  selected: Set<string>;
  onToggle: (drive: string) => void;
}

/** Multi-select chips to filter the library grid by drive letter (C:\, D:\, ...). */
export function DriveFilter({ drives, selected, onToggle }: DriveFilterProps) {
  if (drives.length <= 1) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {drives.map((drive) => {
        const active = selected.has(drive);
        return (
          <button
            key={drive}
            type="button"
            onClick={() => onToggle(drive)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border",
              active ? "bg-primary text-primary-foreground border-transparent" : "bg-secondary/50 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            <HardDrive size={12} />
            {drive.replace(/\\$/, "")}
          </button>
        );
      })}
    </div>
  );
}
