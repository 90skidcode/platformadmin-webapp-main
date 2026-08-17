import * as React from "react";

/** Calls `onOutside` on a pointerdown outside every element in `refs` while
 * `enabled`. Multiple refs so a trigger + its portaled content can both
 * count as "inside" (clicking the trigger to toggle shouldn't also be seen
 * as an outside click on the content). */
export function useOutsideClick(
  refs: Array<React.RefObject<HTMLElement | null>>,
  onOutside: () => void,
  enabled: boolean,
) {
  React.useEffect(() => {
    if (!enabled) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      const isInside = refs.some((ref) => ref.current?.contains(target));
      if (!isInside) onOutside();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [refs, onOutside, enabled]);
}
