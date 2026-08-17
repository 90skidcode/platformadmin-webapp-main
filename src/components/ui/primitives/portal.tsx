"use client";

import * as React from "react";
import { createPortal } from "react-dom";

export interface PortalProps {
  children: React.ReactNode;
  /** Defaults to `document.body`, same as Radix's Portal. */
  container?: Element | null;
}

/**
 * Local replacement for `@radix-ui/react-*`'s `Portal` primitive. Renders
 * `children` into `container` (document.body by default) instead of in
 * place -- used for anything that must visually escape a clipping/z-index
 * ancestor: dialogs, dropdown/select content, tooltips.
 *
 * Synchronous, not gated behind a mount effect: every current consumer
 * (Dialog/AlertDialog/DropdownMenu/Select/Tooltip content, Toast) already
 * only renders `<Portal>` once its own `open`/`rendered` state is true --
 * `false` on both the server render and the client's first hydration pass
 * -- so `<Portal>` itself is never actually reached before hydration, and
 * there's no mismatch to guard against. A mount-effect gate was tried
 * first and caused a real bug instead: it deferred the portaled content's
 * DOM node by one extra render, so a *sibling* layout effect that measures
 * that node (`usePopoverPosition`) ran with `contentRef.current` still
 * null and never got a second chance to recompute -- content stuck
 * permanently at `opacity: 0`. Being synchronous means everything commits,
 * and DOM refs attach, in one pass.
 */
export function Portal({ children, container }: Readonly<PortalProps>) {
  if (typeof document === "undefined") return null;
  return createPortal(children, container ?? document.body);
}
