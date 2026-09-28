import { ArrowDownAZ, ArrowDownWideNarrow, ArrowUpAZ, ArrowUpWideNarrow, Clock, History, Sparkles } from "lucide-react";

import type { SortId } from "@/domain/catalog-sort";

export interface SortOption {
  id: SortId;
  label: string;
  Icon: React.FC<{ className?: string }>;
}

export const SORT_OPTIONS: SortOption[] = [
  { id: "updates", label: "Novidades", Icon: Sparkles },
  { id: "az", label: "A → Z", Icon: ArrowUpAZ },
  { id: "za", label: "Z → A", Icon: ArrowDownAZ },
  { id: "newest", label: "Recente", Icon: Clock },
  { id: "oldest", label: "Antigo", Icon: History },
  { id: "largest", label: "Maior", Icon: ArrowUpWideNarrow },
  { id: "smallest", label: "Menor", Icon: ArrowDownWideNarrow },
];
