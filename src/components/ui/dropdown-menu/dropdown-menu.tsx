"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import {
  Portal,
  Slot,
  mergeRefs,
  useControllableState,
  useEscapeKey,
  useOutsideClick,
  usePopoverPosition,
  usePresence,
  type PopoverAlign,
} from "../primitives";

const MENU_ITEM_SELECTOR = '[role="menuitem"]:not([data-disabled])';

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  menuId: string;
}
const DropdownMenuContext =
  React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext(component: string) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error(`${component} must be used within <DropdownMenu>`);
  }
  return context;
}

export interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DropdownMenu({
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
}: Readonly<DropdownMenuProps>) {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const menuId = React.useId();

  const context = React.useMemo(
    () => ({ open, setOpen, triggerRef, contentRef, menuId }),
    [open, setOpen, menuId],
  );

  return (
    <DropdownMenuContext.Provider value={context}>
      {children}
    </DropdownMenuContext.Provider>
  );
}

export interface DropdownMenuTriggerProps
  extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLElement,
  DropdownMenuTriggerProps
>(({ asChild = false, onClick, onKeyDown, ...props }, forwardedRef) => {
  const { open, setOpen, triggerRef, menuId } = useDropdownMenuContext(
    "DropdownMenuTrigger",
  );
  const Comp: React.ElementType = asChild ? Slot : "button";

  return (
    <Comp
      ref={mergeRefs(forwardedRef, triggerRef)}
      type={asChild ? undefined : "button"}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={menuId}
      onClick={(event: React.MouseEvent<HTMLElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(!open);
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setOpen(true);
        }
      }}
      {...props}
    />
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export interface DropdownMenuContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: PopoverAlign;
  sideOffset?: number;
}

export const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(
  (
    { className, align = "start", sideOffset = 4, onKeyDown, ...props },
    forwardedRef,
  ) => {
    const { open, setOpen, triggerRef, contentRef, menuId } =
      useDropdownMenuContext("DropdownMenuContent");
    // Must come before usePopoverPosition and the focus-first-item effect
    // below: `rendered` (not `open`) is what actually gates whether the
    // content DOM node exists yet -- see usePopoverPosition's own comment.
    const { rendered, nodeRef } = usePresence(open);

    const close = React.useCallback(
      (refocusTrigger: boolean) => {
        setOpen(false);
        if (refocusTrigger) triggerRef.current?.focus();
      },
      [setOpen, triggerRef],
    );

    useEscapeKey(() => close(true), open);
    useOutsideClick([triggerRef, contentRef], () => setOpen(false), open);

    const style = usePopoverPosition(rendered, triggerRef, contentRef, {
      side: "bottom",
      align,
      sideOffset,
    });

    // Focuses the first item once the menu's content actually mounts --
    // arrow keys then move focus among items directly (roving focus over
    // real, tabbable buttons).
    React.useEffect(() => {
      if (!rendered) return;
      const first =
        contentRef.current?.querySelector<HTMLElement>(MENU_ITEM_SELECTOR);
      first?.focus();
    }, [rendered, contentRef]);

    function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;
      const container = contentRef.current;
      if (!container) return;
      const items = Array.from(
        container.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR),
      );
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);

      if (event.key === "ArrowDown") {
        event.preventDefault();
        items[(currentIndex + 1) % items.length]?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        items[(currentIndex - 1 + items.length) % items.length]?.focus();
      } else if (event.key === "Home") {
        event.preventDefault();
        items[0]?.focus();
      } else if (event.key === "End") {
        event.preventDefault();
        items.at(-1)?.focus();
      } else if (event.key === "Tab") {
        close(false);
      }
    }

    if (!rendered) return null;

    return (
      <Portal>
        <div
          ref={mergeRefs(forwardedRef, contentRef, nodeRef)}
          id={menuId}
          role="menu"
          tabIndex={-1}
          data-state={open ? "open" : "closed"}
          style={style}
          onKeyDown={handleKeyDown}
          className={cn(
            "z-dropdown min-w-32 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
            className,
          )}
          {...props}
        />
      </Portal>
    );
  },
);
DropdownMenuContent.displayName = "DropdownMenuContent";

export interface DropdownMenuItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> {
  inset?: boolean;
  variant?: "default" | "destructive";
  /** Fired on click/Enter/Space; call `event.preventDefault()` to keep the menu open. */
  onSelect?: (event: Event) => void;
}

export const DropdownMenuItem = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuItemProps
>(
  (
    {
      className,
      inset,
      variant = "default",
      onSelect,
      onClick,
      disabled,
      ...props
    },
    ref,
  ) => {
    const { setOpen, triggerRef } = useDropdownMenuContext("DropdownMenuItem");

    function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
      onClick?.(event);
      if (disabled) return;
      const selectEvent = new Event("select", { cancelable: true });
      onSelect?.(selectEvent);
      if (!selectEvent.defaultPrevented) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        role="menuitem"
        tabIndex={-1}
        disabled={disabled}
        data-disabled={disabled ? "" : undefined}
        onClick={handleClick}
        className={cn(
          "relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors outline-none select-none focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
          inset && "pl-8",
          variant === "destructive" &&
            "text-destructive focus:bg-destructive/10 focus:text-destructive",
          className,
        )}
        {...props}
      />
    );
  },
);
DropdownMenuItem.displayName = "DropdownMenuItem";

export function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return (
    <div
      className={cn(
        "px-2 py-1.5 text-sm font-semibold text-foreground",
        inset && "pl-8",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLHRElement>) {
  // <hr> already carries an implicit role="separator" -- no need to set one.
  return (
    <hr className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
  );
}

export function DropdownMenuShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

// Kept for API parity with a checkmark-prefixed item, in case a future
// screen needs a checkable menu item -- not currently used anywhere.
export const DropdownMenuCheckboxItem = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuItemProps & { checked?: boolean }
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuItem
    ref={ref}
    className={cn("relative py-1.5 pr-2 pl-8", className)}
    {...props}
  >
    {checked && (
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <Check className="size-4" aria-hidden="true" />
      </span>
    )}
    {children}
  </DropdownMenuItem>
));
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";
