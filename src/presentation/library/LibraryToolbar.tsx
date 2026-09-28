import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

interface LibraryToolbarProps {
  count: number;
  isRefreshing: boolean;
  search: string;
  onSearchChange: (value: string) => void;
}

export function LibraryToolbar({ count, isRefreshing, search, onSearchChange }: LibraryToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-2xl font-black text-white/90 tracking-tighter uppercase whitespace-nowrap">
          Sua Coleção <span className="text-primary text-lg ml-2">({count})</span>
        </h2>
        {isRefreshing && <span className="text-[9px] uppercase tracking-[0.3em] text-slate-600">Atualizando</span>}
      </div>

      <div className="relative w-64 shrink-0">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <Input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Pesquisar..." className="pl-10 h-10" />
      </div>
    </div>
  );
}
