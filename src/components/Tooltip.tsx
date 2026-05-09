import { AnimatePresence, motion } from "framer-motion";
import {
  cloneElement,
  isValidElement,
  ReactElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: string;
  children: ReactElement;
  disabled?: boolean;
  wrapperClassName?: string;
}

type TooltipPlacement = "top" | "bottom";

export function Tooltip({ content, children, disabled = false }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [placement, setPlacement] = useState<TooltipPlacement>("top");
  const [coords, setCoords] = useState({ left: 0, top: 0 });
  const [arrowLeft, setArrowLeft] = useState(0);
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tooltipRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current || !tooltipRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const gap = 12;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const topCandidate = triggerRect.top - tooltipRect.height - gap;
      const bottomCandidate = triggerRect.bottom + gap;
      const canOpenTop = topCandidate >= 8;
      const canOpenBottom = bottomCandidate + tooltipRect.height <= viewportHeight - 8;
      const nextPlacement: TooltipPlacement = canOpenTop || !canOpenBottom ? "top" : "bottom";

      const preferredLeft = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
      let left = Math.max(8, Math.min(preferredLeft, viewportWidth - tooltipRect.width - 8));
      const triggerCenter = triggerRect.left + triggerRect.width / 2;
      const nextArrowLeft = Math.max(12, Math.min(triggerCenter - left, tooltipRect.width - 12));

      setPlacement(nextPlacement);
      setArrowLeft(nextArrowLeft);
      setCoords({
        left,
        top: nextPlacement === "top" ? topCandidate : bottomCandidate
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, content]);

  if (disabled || !isValidElement(children)) {
    return children;
  }

  const child = children as ReactElement<any>;
  const childRef = (child as any).ref;
  const mergedProps = {
    ...child.props,
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      if (typeof childRef === "function") {
        childRef(node);
      } else if (childRef && typeof childRef === "object") {
        (childRef as { current: HTMLElement | null }).current = node;
      }
    },
    onMouseEnter: (event: React.MouseEvent) => {
      child.props.onMouseEnter?.(event);
      setOpen(true);
    },
    onMouseLeave: (event: React.MouseEvent) => {
      child.props.onMouseLeave?.(event);
      setOpen(false);
    },
    onFocus: (event: React.FocusEvent) => {
      child.props.onFocus?.(event);
      setOpen(true);
    },
    onBlur: (event: React.FocusEvent) => {
      child.props.onBlur?.(event);
      setOpen(false);
    }
  };

  return (
    <>
      {cloneElement(child, mergedProps)}
      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={tooltipRef}
              initial={{ opacity: 0, y: placement === "top" ? 6 : -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: placement === "top" ? 4 : -4, scale: 0.98 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="pointer-events-none fixed whitespace-nowrap rounded-xl border border-[#a4e6ff]/12 bg-[#111319]/96 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#dff7ff] shadow-[0_18px_48px_rgba(0,0,0,0.48)] backdrop-blur-md"
              style={{
                left: `${coords.left}px`,
                top: `${coords.top}px`,
                zIndex: 2147483647
              }}
            >
              <span
                className="absolute h-2 w-2 -translate-x-1/2 rotate-45 border-[#a4e6ff]/12 bg-[#111319]/96"
                style={{
                  left: `${arrowLeft}px`,
                  ...(placement === "top"
                    ? { bottom: "-5px", borderRightWidth: "1px", borderBottomWidth: "1px" }
                    : { top: "-5px", borderLeftWidth: "1px", borderTopWidth: "1px" })
                }}
              />
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
