import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export const Sheet = SheetPrimitive.Root;

export function SheetContent({
  className,
  children,
  side = "bottom",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: "bottom" | "right" }) {
  const sideClasses =
    side === "bottom"
      ? "inset-x-0 bottom-0 max-h-[75vh] rounded-t-[28px] border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom"
      : "top-9 bottom-0 right-0 w-[min(420px,92vw)] border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right";

  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-[100] bg-[#050507]/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <SheetPrimitive.Content
        className={cn(
          "fixed z-[110] flex flex-col border-white/10 bg-card p-6 shadow-[0_-20px_60px_rgba(0,0,0,0.5)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out duration-300",
          sideClasses,
          className
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute right-5 top-5 h-8 w-8 flex items-center justify-center rounded-full text-slate-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
          <X size={16} />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 mb-4 shrink-0", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn("text-lg font-black tracking-tight text-white", className)} {...props} />;
}
