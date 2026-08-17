"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";
import {
  Portal,
  Slot,
  mergeRefs,
  useControllableState,
  useEscapeKey,
  usePopoverPosition,
  usePresence,
} from "../primitives";

interface TooltipProviderValue {
  delayDuration: number;
}
const TooltipProviderContext = React.createContext<TooltipProviderValue>({
  delayDuration: 700,
});

export interface TooltipProviderProps {
  /** Hover delay before a tooltip opens, in ms. A `<Tooltip delayDuration>` overrides this per-instance. */
  delayDuration?: number;
  children: React.ReactNode;
}

export function TooltipProvider({
  delayDuration = 700,
  children,
}: Readonly<TooltipProviderProps>) {
  const value = React.useMemo(() => ({ delayDuration }), [delayDuration]);
  return (
    <TooltipProviderContext.Provider value={value}>
      {children}
    </TooltipProviderContext.Provider>
  );
}

interface TooltipContextValue {
  open: boolean;
  show: () => void;
  hide: () => void;
  hideImmediately: () => void;
  cancelHide: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLElement | null>;
  contentId: string;
}
const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function useTooltipContext(component: string) {
  const context = React.useContext(TooltipContext);
  if (!context) throw new Error(`${component} must be used within <Tooltip>`);
  return context;
}

export interface TooltipProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hover delay before opening, in ms. Defaults to the nearest TooltipProvider's. */
  delayDuration?: number;
  /** When false (default), a short grace period lets the pointer travel from
   * trigger to content without the tooltip closing -- a fixed-delay
   * approximation of Radix's pointer-geometry-based "hoverable content",
   * not an exact port. */
  disableHoverableContent?: boolean;
}

export function Tooltip({
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  delayDuration,
  disableHoverableContent = false,
}: Readonly<TooltipProps>) {
  const { delayDuration: providerDelay } = React.useContext(
    TooltipProviderContext,
  );
  const resolvedDelay = delayDuration ?? providerDelay;
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLElement | null>(null);
  const contentId = React.useId();
  const openTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = React.useCallback(() => {
    clearTimeout(closeTimer.current);
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => setOpen(true), resolvedDelay);
  }, [resolvedDelay, setOpen]);

  const hide = React.useCallback(() => {
    clearTimeout(openTimer.current);
    if (disableHoverableContent) {
      setOpen(false);
      return;
    }
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }, [disableHoverableContent, setOpen]);

  const hideImmediately = React.useCallback(() => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    setOpen(false);
  }, [setOpen]);

  // Lets the content's own onMouseEnter cancel a pending hide() -- the
  // pointer made it from trigger to content within the grace period.
  const cancelHide = React.useCallback(() => {
    clearTimeout(closeTimer.current);
  }, []);

  React.useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
    },
    [],
  );

  const context = React.useMemo(
    () => ({
      open,
      show,
      hide,
      hideImmediately,
      cancelHide,
      triggerRef,
      contentRef,
      contentId,
    }),
    [open, show, hide, hideImmediately, cancelHide, contentId],
  );

  return (
    <TooltipContext.Provider value={context}>
      {children}
    </TooltipContext.Provider>
  );
}

export interface TooltipTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

export const TooltipTrigger = React.forwardRef<
  HTMLElement,
  TooltipTriggerProps
>(
  (
    { asChild = false, onMouseEnter, onMouseLeave, onFocus, onBlur, ...props },
    forwardedRef,
  ) => {
    const { show, hide, hideImmediately, triggerRef, open, contentId } =
      useTooltipContext("TooltipTrigger");
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={mergeRefs(forwardedRef, triggerRef)}
        type={asChild ? undefined : "button"}
        aria-describedby={open ? contentId : undefined}
        onMouseEnter={(event: React.MouseEvent<HTMLElement>) => {
          onMouseEnter?.(event);
          show();
        }}
        onMouseLeave={(event: React.MouseEvent<HTMLElement>) => {
          onMouseLeave?.(event);
          hide();
        }}
        onFocus={(event: React.FocusEvent<HTMLElement>) => {
          onFocus?.(event);
          show();
        }}
        onBlur={(event: React.FocusEvent<HTMLElement>) => {
          onBlur?.(event);
          hideImmediately();
        }}
        {...props}
      />
    );
  },
);
TooltipTrigger.displayName = "TooltipTrigger";

export const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { sideOffset?: number }
>(
  (
    { className, sideOffset = 4, onMouseEnter, onMouseLeave, ...props },
    forwardedRef,
  ) => {
    const {
      open,
      hide,
      hideImmediately,
      cancelHide,
      triggerRef,
      contentRef,
      contentId,
    } = useTooltipContext("TooltipContent");
    useEscapeKey(hideImmediately, open);
    // Must come before usePopoverPosition: `rendered` (not `open`) is what
    // actually gates whether the content DOM node exists yet -- see
    // usePopoverPosition's own comment.
    const { rendered, nodeRef } = usePresence(open);
    const style = usePopoverPosition(rendered, triggerRef, contentRef, {
      side: "top",
      align: "center",
      sideOffset,
    });

    if (!rendered) return null;

    return (
      <Portal>
        <div
          ref={mergeRefs(forwardedRef, contentRef, nodeRef)}
          id={contentId}
          role="tooltip"
          data-state={open ? "delayed-open" : "closed"}
          style={style}
          onMouseEnter={(event) => {
            onMouseEnter?.(event);
            // The pointer made it from trigger to content within hide()'s
            // grace period -- cancel the pending close.
            cancelHide();
          }}
          onMouseLeave={(event) => {
            onMouseLeave?.(event);
            hide();
          }}
          className={cn(
            "z-tooltip overflow-hidden rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-neutral-50 shadow-md data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95",
            className,
          )}
          {...props}
        />
      </Portal>
    );
  },
);
TooltipContent.displayName = "TooltipContent";
