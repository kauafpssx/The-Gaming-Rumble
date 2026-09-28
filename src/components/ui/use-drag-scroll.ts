import { useRef } from "react";

/**
 * Mouse/touch drag-to-scroll for a horizontally scrollable element.
 *
 * Pointer capture only engages once movement crosses a small threshold —
 * capturing on pointerdown would retarget the eventual click to the
 * scroll container, breaking taps on children (buttons/links). Below the
 * threshold nothing is touched; once a real drag starts we take over and
 * swallow the trailing click so it doesn't activate whatever's underneath.
 */
export function useDragScroll<T extends HTMLElement>(ref: React.RefObject<T | null>) {
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

  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClickCapture };
}
