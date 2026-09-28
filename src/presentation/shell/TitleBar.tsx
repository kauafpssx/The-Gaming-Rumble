import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface TitleBarProps {
  interactionLocked?: boolean;
}

export function TitleBar({ interactionLocked = false }: TitleBarProps) {
  const win = getCurrentWindow();

  const handleDrag = (e: React.MouseEvent) => {
    if (interactionLocked) return;
    if (e.target instanceof HTMLElement && e.target.closest("button")) return;
    win.startDragging();
  };

  return (
    <header
      className={cn(
        "relative z-[120] h-9 flex items-center justify-between pl-4 bg-[#0e0e10] border-b border-white/5 shrink-0",
        interactionLocked && "pointer-events-none select-none"
      )}
      onMouseDown={handleDrag}
    >
      <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600">Gaming Rumble</span>

      <div className="flex items-center h-full">
        {!interactionLocked && (
          <>
            <button
              onClick={() => win.minimize()}
              className="h-9 w-11 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={() => win.close()}
              className="h-9 w-11 flex items-center justify-center text-slate-500 hover:text-white hover:bg-red-500 transition-all cursor-pointer"
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
