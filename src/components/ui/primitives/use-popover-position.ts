import * as React from "react";

export type PopoverSide = "top" | "bottom" | "left" | "right";
export type PopoverAlign = "start" | "center" | "end";

export interface UsePopoverPositionOptions {
  side?: PopoverSide;
  align?: PopoverAlign;
  sideOffset?: number;
}

const VIEWPORT_PADDING = 4;

/** Positions portaled popover content (DropdownMenu/Select/Tooltip) relative
 * to its trigger, `fixed`-positioned so it escapes any clipping ancestor.
 * Flips to the opposite side if the preferred side would overflow the
 * viewport, and clamps into the viewport horizontally/vertically -- a
 * lightweight stand-in for Radix's Popper collision detection, not a full
 * reimplementation (no mid-scroll re-flip animation, no `avoidCollisions`
 * toggle). Recomputes when `mounted` turns true, and on resize/scroll
 * while mounted.
 *
 * `mounted` must reflect the content actually being in the DOM (e.g.
 * `usePresence`'s `rendered`), not just logical open state -- passing
 * `open` directly caused a real bug: `usePresence` itself flips `rendered`
 * true one render *after* `open` does (via its own effect), so a
 * layout effect keyed on `open` fires and measures `contentRef.current`
 * while it's still null (content hasn't mounted yet), then never gets a
 * second chance to run once it does. Content sat permanently at
 * `opacity: 0`, invisible but still fully interactive by ARIA role --
 * exactly the kind of bug jsdom-based tests can't catch (no real
 * getBoundingClientRect/layout), only caught by driving a real browser. */
export function usePopoverPosition(
  mounted: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  contentRef: React.RefObject<HTMLElement | null>,
  {
    side = "bottom",
    align = "start",
    sideOffset = 4,
  }: UsePopoverPositionOptions,
) {
  const [style, setStyle] = React.useState<React.CSSProperties>({
    position: "fixed",
    top: 0,
    left: 0,
    opacity: 0,
  });

  React.useLayoutEffect(() => {
    if (!mounted) return;

    function recalc() {
      const trigger = triggerRef.current;
      const content = contentRef.current;
      if (!trigger || !content) return;
      const triggerRect = trigger.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let resolvedSide = side;
      if (
        side === "bottom" &&
        triggerRect.bottom + sideOffset + contentRect.height > viewportHeight
      ) {
        resolvedSide = "top";
      } else if (
        side === "top" &&
        triggerRect.top - sideOffset - contentRect.height < 0
      ) {
        resolvedSide = "bottom";
      }

      let top: number;
      let left: number;
      switch (resolvedSide) {
        case "top":
          top = triggerRect.top - sideOffset - contentRect.height;
          left = triggerRect.left;
          break;
        case "left":
          top = triggerRect.top;
          left = triggerRect.left - sideOffset - contentRect.width;
          break;
        case "right":
          top = triggerRect.top;
          left = triggerRect.right + sideOffset;
          break;
        case "bottom":
        default:
          top = triggerRect.bottom + sideOffset;
          left = triggerRect.left;
      }

      if (resolvedSide === "top" || resolvedSide === "bottom") {
        if (align === "start") left = triggerRect.left;
        else if (align === "end") left = triggerRect.right - contentRect.width;
        else
          left =
            triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
      }

      left = Math.min(
        Math.max(left, VIEWPORT_PADDING),
        viewportWidth - contentRect.width - VIEWPORT_PADDING,
      );
      top = Math.min(
        Math.max(top, VIEWPORT_PADDING),
        viewportHeight - contentRect.height - VIEWPORT_PADDING,
      );

      setStyle({ position: "fixed", top, left, opacity: 1 });
    }

    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [mounted, side, align, sideOffset, triggerRef, contentRef]);

  return style;
}
