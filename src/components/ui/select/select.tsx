"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import {
  Portal,
  mergeRefs,
  useControllableState,
  useEscapeKey,
  useOutsideClick,
  usePopoverPosition,
  usePresence,
} from "../primitives";

const OPTION_SELECTOR = '[role="option"]:not([data-disabled])';

interface SelectContextValue {
  value: string | undefined;
  setValue: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  listboxId: string;
  /** Select's own children, walked by SelectValue to find the selected
   * item's label -- see findLabelForValue below. Not DOM/mount-order
   * dependent, unlike an item-registration approach would be: SelectContent
   * (and its SelectItems) only mount while open, but the trigger needs to
   * show a label even when closed. */
  children: React.ReactNode;
}
const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext(component: string) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error(`${component} must be used within <Select>`);
  return context;
}

function findLabelForValue(
  node: React.ReactNode,
  value: string | undefined,
): React.ReactNode | undefined {
  if (value === undefined) return undefined;
  let found: React.ReactNode;
  React.Children.forEach(node, (child) => {
    if (found !== undefined || !React.isValidElement(child)) return;
    const props = child.props as {
      value?: string;
      children?: React.ReactNode;
    };
    if (child.type === SelectItem && props.value === value) {
      found = props.children;
      return;
    }
    if (props.children) found = findLabelForValue(props.children, value);
  });
  return found;
}

export interface SelectProps {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}

export function Select({
  children,
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
}: Readonly<SelectProps>) {
  const [value, setValue] = useControllableState<string | undefined>({
    value: valueProp,
    defaultValue,
    onChange: (next) => {
      if (next !== undefined) onValueChange?.(next);
    },
  });
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const listboxId = React.useId();

  const context = React.useMemo(
    () => ({
      value,
      setValue,
      open,
      setOpen,
      disabled,
      triggerRef,
      contentRef,
      listboxId,
      children,
    }),
    [value, setValue, open, setOpen, disabled, listboxId, children],
  );

  return (
    <SelectContext.Provider value={context}>{children}</SelectContext.Provider>
  );
}

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, onClick, onKeyDown, ...props }, forwardedRef) => {
  const { open, setOpen, disabled, triggerRef, listboxId } =
    useSelectContext("SelectTrigger");

  return (
    <button
      ref={mergeRefs(forwardedRef, triggerRef)}
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listboxId}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !disabled) setOpen(!open);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || disabled) return;
        if (
          event.key === "ArrowDown" ||
          event.key === "ArrowUp" ||
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          setOpen(true);
        }
      }}
      className={cn(
        "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-ring/15 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

export interface SelectValueProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: React.ReactNode;
}

export function SelectValue({
  placeholder,
  className,
  ...props
}: Readonly<SelectValueProps>) {
  const { value, children } = useSelectContext("SelectValue");
  const label = findLabelForValue(children, value);
  return (
    <span
      data-placeholder={label === undefined ? "" : undefined}
      className={cn(label === undefined && "text-muted-foreground", className)}
      {...props}
    >
      {label ?? placeholder}
    </span>
  );
}

export const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, onKeyDown, ...props }, forwardedRef) => {
  const { open, setOpen, value, triggerRef, contentRef, listboxId } =
    useSelectContext("SelectContent");
  // Must come before usePopoverPosition and the focus-selected-option effect
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
    align: "start",
    sideOffset: 4,
  });

  // Focus the selected option (or the first one) once the listbox's
  // content actually mounts.
  React.useEffect(() => {
    if (!rendered) return;
    const container = contentRef.current;
    if (!container) return;
    const selected = value
      ? container.querySelector<HTMLElement>(
          `[data-value="${CSS.escape(value)}"]`,
        )
      : null;
    (
      selected ?? container.querySelector<HTMLElement>(OPTION_SELECTOR)
    )?.focus();
  }, [rendered, value, contentRef]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const container = contentRef.current;
    if (!container) return;
    const options = Array.from(
      container.querySelectorAll<HTMLElement>(OPTION_SELECTOR),
    );
    const currentIndex = options.indexOf(document.activeElement as HTMLElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      options[(currentIndex + 1) % options.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      options[(currentIndex - 1 + options.length) % options.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      options[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      options.at(-1)?.focus();
    } else if (event.key === "Tab") {
      close(false);
    }
  }

  if (!rendered) return null;

  return (
    <Portal>
      <div
        ref={mergeRefs(forwardedRef, contentRef, nodeRef)}
        id={listboxId}
        role="listbox"
        tabIndex={-1}
        data-state={open ? "open" : "closed"}
        style={style}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative z-popover max-h-96 min-w-32 overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md",
          className,
        )}
        {...props}
      />
    </Portal>
  );
});
SelectContent.displayName = "SelectContent";

export interface SelectItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  value: string;
  disabled?: boolean;
}

export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, disabled, onClick, ...props }, ref) => {
    const {
      value: selectedValue,
      setValue,
      setOpen,
      triggerRef,
    } = useSelectContext("SelectItem");
    const selected = selectedValue === value;

    function handleClick(event: React.MouseEvent<HTMLDivElement>) {
      onClick?.(event);
      if (disabled) return;
      setValue(value);
      setOpen(false);
      triggerRef.current?.focus();
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
      if (disabled) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setValue(value);
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    return (
      <div
        ref={ref}
        role="option"
        tabIndex={-1}
        aria-selected={selected}
        data-value={value}
        data-disabled={disabled ? "" : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative flex w-full cursor-default items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className,
        )}
        {...props}
      >
        {selected && (
          <span className="absolute left-2 flex size-3.5 items-center justify-center">
            <Check className="size-4" aria-hidden="true" />
          </span>
        )}
        {children}
      </div>
    );
  },
);
SelectItem.displayName = "SelectItem";
