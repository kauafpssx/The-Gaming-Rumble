import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-widest border",
  {
    variants: {
      variant: {
        default: "bg-white/5 text-slate-400 border-white/5",
        primary: "bg-primary/10 text-primary border-primary/20",
        success: "bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20",
        destructive: "bg-destructive/10 text-destructive border-destructive/20",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
