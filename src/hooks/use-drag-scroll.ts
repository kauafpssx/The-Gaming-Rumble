import { useRef } from "react";

/**
 * Mouse/touch drag-to-scroll for a horizontally scrollable element.
 *
 * Pointer capture is only engaged once movement crosses a small threshold —
 * capturing immediately on pointerdown would retarget the eventual pointerup
 * (and native click) to the scroll container itself, so a plain tap/click on
 * a child button would never fire. Below the threshold nothing is touched,
 * so ordinary clicks pass through untouched; once a real drag starts we take
 * over and swallow the trailing click so it doesn't activate whatever is
 * under the cursor.
 *
 * Capture also means a drag that ends outside the element (or the whole
 * modal) still resolves normally instead of leaking a mouseup/click to
 * whatever's underneath.
 */
export function useDragScroll<T extends HTMLElement>(ref: React.RefObject<T>) {
  const drag = useRef({ startX: 0, startScroll: 0, active: false, captured: false, moved: false });

  const onPointerDown = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.button !== 0) return;
    drag.current = { startX: e.clientX, startScroll: el.scrollLeft, active: true, captured: false, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = ref.current;
    const st = drag.current;
    if (!st.active || !el) return;
    const dx = e.clientX - st.startX;

    if (!st.captured) {
      if (Math.abs(dx) <= 3) return;
      st.captured = true;
      st.moved = true;
      el.setPointerCapture(e.pointerId);
    }

    el.scrollLeft = st.startScroll - dx;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const el = ref.current;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    drag.current.active = false;
  };

  // Swallow the click that follows a real drag so items underneath (links/buttons) don't fire.
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onClickCapture,
  };
}
