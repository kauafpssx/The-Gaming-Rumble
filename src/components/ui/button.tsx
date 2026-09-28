import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-bold tracking-widest uppercase transition-all disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:text-white",
        solid: "bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-[0_15px_40px_rgba(164,230,255,0.15)] hover:shadow-[0_20px_50px_rgba(164,230,255,0.3)] active:scale-[0.97]",
        outline: "border border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.06] hover:text-white",
        ghost: "text-slate-500 hover:text-white hover:bg-white/[0.06]",
        destructive: "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-[11px]",
        lg: "h-14 px-6 text-sm",
        icon: "h-11 w-11 shrink-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
