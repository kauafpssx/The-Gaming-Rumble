import {
  Sparkles,
  ArrowUpAZ,
  ArrowDownAZ,
  Clock,
  History,
  ArrowUpWideNarrow,
  ArrowDownWideNarrow,
} from "lucide-react";
import { type SortId } from "@/lib/games";

export type SortOption = { id: SortId; label: string; Icon: React.FC<{ className?: string }> };

export const SORT_OPTIONS: SortOption[] = [
  { id: "updates",  label: "Novidades", Icon: Sparkles },
  { id: "az",       label: "A → Z",   Icon: ArrowUpAZ },
  { id: "za",       label: "Z → A",   Icon: ArrowDownAZ },
  { id: "newest",   label: "Recente", Icon: Clock },
  { id: "oldest",   label: "Antigo",  Icon: History },
  { id: "largest",  label: "Maior",   Icon: ArrowUpWideNarrow },
  { id: "smallest", label: "Menor",   Icon: ArrowDownWideNarrow },
];
