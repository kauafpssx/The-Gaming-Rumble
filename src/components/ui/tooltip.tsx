import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({
  content,
  children,
  disabled = false,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactElement;
  disabled?: boolean;
  side?: "top" | "bottom" | "left" | "right";
}) {
  if (disabled || !content) return children;

  return (
    <TooltipPrimitive.Root delayDuration={200}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={8}
          className={cn(
            "z-[200] rounded-lg border border-white/10 bg-[#1b1b1d] px-3 py-1.5 text-[10px] font-medium normal-case tracking-wide text-white/85 shadow-xl data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0"
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-[#1b1b1d]" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
