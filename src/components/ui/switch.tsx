import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer relative h-9 w-16 shrink-0 cursor-pointer rounded-full border border-white/10 bg-white/[0.04] transition-all disabled:cursor-not-allowed disabled:opacity-45 data-[state=checked]:border-primary/40 data-[state=checked]:bg-primary/15",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block h-7 w-7 translate-x-1 rounded-full bg-slate-500 transition-transform data-[state=checked]:translate-x-8 data-[state=checked]:bg-primary data-[state=checked]:shadow-[0_0_20px_rgba(164,230,255,0.35)]" />
    </SwitchPrimitive.Root>
  );
}
