"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { mergeRefs, usePresence } from "@/components/ui/primitives";

// Radix's Toast.Root portals itself into whichever Toast.Viewport is
// currently registered, regardless of where it sits in the JSX tree --
// Toaster.tsx renders <Toast> items as siblings of <ToastViewport/>, not as
// its children, and relies on exactly that. Replicated here via a ref to
// the viewport's DOM node, shared through context: ToastViewport sets it on
// mount, Toast reads it and portals into it once available.
const ViewportContext =
  React.createContext<React.RefObject<HTMLOListElement | null> | null>(null);

// Lets ToastClose (rendered as a child of Toast, however deep) call back up
// to close its own ancestor Toast -- same relationship Radix's Toast.Close
// has to Toast.Root.
const ToastRootContext = React.createContext<{ close: () => void } | null>(
  null,
);

export function ToastProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewportRef = React.useRef<HTMLOListElement | null>(null);
  return (
    <ViewportContext.Provider value={viewportRef}>
      {children}
    </ViewportContext.Provider>
  );
}

export const ToastViewport = React.forwardRef<
  HTMLOListElement,
  React.HTMLAttributes<HTMLOListElement>
>(({ className, ...props }, forwardedRef) => {
  const viewportRef = React.useContext(ViewportContext);
  return (
    <ol
      ref={mergeRefs(forwardedRef, viewportRef)}
      tabIndex={-1}
      className={cn(
        "fixed right-0 bottom-0 z-toast flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-sm",
        className,
      )}
      {...props}
    />
  );
});
ToastViewport.displayName = "ToastViewport";

const toastVariants = cva(
  // Swipe-state translation is NOT here as Tailwind utility classes -- see
  // the data-swipe rules in globals.css for why: Tailwind v4's
  // arbitrary-value parser has a real compiler bug that corrupts the
  // generated CSS (a hard parse error under `next dev`, not just a
  // build-output warning) when two very-similar arbitrary translate-x
  // candidates exist in scanned text together, which is exactly this case
  // (--toast-swipe-end-x vs -move-x). Deliberately not spelling out the
  // actual bracket syntax here either -- Tailwind's scanner is a plain text
  // match over every file it reads, comments included, and doing so once
  // already reintroduced this exact crash from inside a comment.
  "pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-md border p-4 shadow-lg transition-all data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-full data-[swipe=end]:animate-out data-[swipe=move]:transition-none",
  {
    variants: {
      variant: {
        default: "border-border bg-background text-foreground",
        success: "border-success/30 bg-success/10 text-foreground",
        warning: "border-warning/30 bg-warning/10 text-foreground",
        error: "border-destructive/30 bg-destructive/10 text-foreground",
        info: "border-info/30 bg-info/10 text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const variantIcon: Record<
  NonNullable<VariantProps<typeof toastVariants>["variant"]>,
  React.ElementType
> = {
  default: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: XCircle,
  info: Info,
};

const variantIconClass: Record<
  NonNullable<VariantProps<typeof toastVariants>["variant"]>,
  string
> = {
  default: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
  info: "text-info",
};

// Pointer travel past this distance (px) counts as a dismiss swipe, not a
// tap/click -- same default Radix's Toast used.
const SWIPE_THRESHOLD = 100;

export interface ToastProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "id">,
    VariantProps<typeof toastVariants> {
  open?: boolean;
  /** Milliseconds before auto-dismiss (paused while hovered/focused). `Infinity` disables it. */
  duration?: number;
  onOpenChange?: (open: boolean) => void;
}

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      className,
      variant = "default",
      children,
      open = true,
      duration = 5000,
      onOpenChange,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      ...props
    },
    forwardedRef,
  ) => {
    const viewportRef = React.useContext(ViewportContext);
    const [mountNode, setMountNode] = React.useState<HTMLOListElement | null>(
      null,
    );
    React.useEffect(() => {
      setMountNode(viewportRef?.current ?? null);
    }, [viewportRef]);

    const [swipe, setSwipe] = React.useState<{
      state: "idle" | "move" | "cancel" | "end";
      x: number;
    }>({ state: "idle", x: 0 });
    const swipeStartX = React.useRef<number | null>(null);

    const timerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
    const remainingRef = React.useRef(duration);
    const startedAtRef = React.useRef(0);

    const close = React.useCallback(
      () => onOpenChange?.(false),
      [onOpenChange],
    );

    const schedule = React.useCallback(
      (ms: number) => {
        clearTimeout(timerRef.current);
        if (ms === Infinity) return;
        startedAtRef.current = Date.now();
        timerRef.current = setTimeout(close, ms);
      },
      [close],
    );

    React.useEffect(() => {
      if (!open) return;
      remainingRef.current = duration;
      schedule(duration);
      return () => clearTimeout(timerRef.current);
    }, [open, duration, schedule]);

    function pauseTimer() {
      clearTimeout(timerRef.current);
      remainingRef.current -= Date.now() - startedAtRef.current;
    }

    function resumeTimer() {
      if (open) schedule(Math.max(remainingRef.current, 0));
    }

    const Icon = variantIcon[variant ?? "default"];
    const { rendered, nodeRef } = usePresence(open);
    const toastRootContextValue = React.useMemo(() => ({ close }), [close]);

    if (!mountNode || !rendered) return null;

    return createPortal(
      <div
        ref={mergeRefs(forwardedRef, nodeRef)}
        role="status"
        aria-live="polite"
        data-state={open ? "open" : "closed"}
        data-swipe={swipe.state === "idle" ? undefined : swipe.state}
        style={
          {
            "--toast-swipe-move-x": `${swipe.x}px`,
            "--toast-swipe-end-x": `${swipe.x}px`,
          } as React.CSSProperties
        }
        className={cn(toastVariants({ variant }), className)}
        onPointerDown={(event) => {
          onPointerDown?.(event);
          if (event.button !== 0) return;
          // Don't hijack pointer capture for a press that started on an
          // interactive descendant (ToastClose, a custom ToastAction) --
          // capturing here would redirect its own pointerup/click away from
          // it. Only the toast's own body area starts a swipe gesture.
          if (
            (event.target as HTMLElement).closest("button, a, [role='button']")
          ) {
            return;
          }
          swipeStartX.current = event.clientX;
          (event.currentTarget as HTMLElement).setPointerCapture(
            event.pointerId,
          );
        }}
        onPointerMove={(event) => {
          onPointerMove?.(event);
          if (swipeStartX.current === null) return;
          setSwipe({ state: "move", x: event.clientX - swipeStartX.current });
        }}
        onPointerUp={(event) => {
          onPointerUp?.(event);
          if (swipeStartX.current === null) return;
          const deltaX = event.clientX - swipeStartX.current;
          swipeStartX.current = null;
          if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
            setSwipe({
              state: "end",
              x: deltaX > 0 ? window.innerWidth : -window.innerWidth,
            });
            close();
          } else {
            setSwipe({ state: "cancel", x: 0 });
          }
        }}
        onMouseEnter={(event) => {
          onMouseEnter?.(event);
          pauseTimer();
        }}
        onMouseLeave={(event) => {
          onMouseLeave?.(event);
          resumeTimer();
        }}
        onFocus={(event) => {
          onFocus?.(event);
          pauseTimer();
        }}
        onBlur={(event) => {
          onBlur?.(event);
          resumeTimer();
        }}
        {...props}
      >
        <Icon
          className={cn(
            "mt-0.5 size-5 shrink-0",
            variantIconClass[variant ?? "default"],
          )}
          aria-hidden="true"
        />
        <ToastRootContext.Provider value={toastRootContextValue}>
          <div className="flex-1 space-y-1">{children}</div>
        </ToastRootContext.Provider>
      </div>,
      mountNode,
    );
  },
);
Toast.displayName = "Toast";

export const ToastTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
));
ToastTitle.displayName = "ToastTitle";

export const ToastDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
ToastDescription.displayName = "ToastDescription";

export const ToastClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const rootContext = React.useContext(ToastRootContext);
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "absolute top-2 right-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus:opacity-100 focus:ring-2 focus:ring-ring focus:outline-none",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) rootContext?.close();
      }}
      {...props}
    >
      <X className="size-4" aria-hidden="true" />
      <span className="sr-only">Close</span>
    </button>
  );
});
ToastClose.displayName = "ToastClose";

export const ToastAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-accent focus:ring-2 focus:ring-ring focus:outline-none",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = "ToastAction";
