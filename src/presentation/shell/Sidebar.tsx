import { LayoutGrid, Library, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

export type ShellView = "catalog" | "library" | "settings";

interface SidebarProps {
  currentView: ShellView;
  onViewChange: (view: ShellView) => void;
  interactionLocked?: boolean;
}

const NAV_ITEMS: { id: ShellView; label: string; icon: typeof LayoutGrid }[] = [
  { id: "catalog", label: "Catálogo", icon: LayoutGrid },
  { id: "library", label: "Biblioteca", icon: Library },
];

export function Sidebar({ currentView, onViewChange, interactionLocked = false }: SidebarProps) {
  return (
    <nav
      className={cn(
        "w-20 shrink-0 flex flex-col items-center py-6 gap-2 bg-[#131315]/90 border-r border-white/5 z-20",
        interactionLocked && "pointer-events-none opacity-40"
      )}
    >
      <img src="/logo.svg" alt="GR" className="w-9 h-9 mb-6" />

      {NAV_ITEMS.map((item) => (
        <Tooltip key={item.id} content={item.label} side="right">
          <button
            type="button"
            onClick={() => onViewChange(item.id)}
            className={cn(
              "h-12 w-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer",
              currentView === item.id
                ? "text-primary bg-white/5 border border-white/5 shadow-inner"
                : "text-slate-500 hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon size={20} />
          </button>
        </Tooltip>
      ))}

      <div className="mt-auto">
        <Tooltip content="Configurações" side="right">
          <button
            type="button"
            onClick={() => onViewChange("settings")}
            className={cn(
              "h-12 w-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer",
              currentView === "settings" ? "text-primary bg-white/10 border border-white/10 shadow-inner" : "text-slate-500 hover:text-primary"
            )}
          >
            <Settings size={20} />
          </button>
        </Tooltip>
      </div>
    </nav>
  );
}
