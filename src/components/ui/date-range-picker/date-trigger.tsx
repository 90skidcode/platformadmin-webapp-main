import * as React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  mergeRefs,
  useEscapeKey,
  useOutsideClick,
  usePopoverPosition,
} from "../primitives";

export function usePopoverPanel({
  triggerRef,
  align,
  onClose,
}: {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  align: "start" | "center" | "end";
  onClose: () => void;
}) {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const popoverStyle = usePopoverPosition(true, triggerRef, contentRef, {
    side: "bottom",
    align,
    sideOffset: 6,
  });

  useEscapeKey(onClose, true);
  const outsideRefs = React.useMemo(
    () => [triggerRef, contentRef],
    [triggerRef, contentRef],
  );
  useOutsideClick(outsideRefs, onClose, true);

  return { contentRef, popoverStyle };
}

export interface DateInputTriggerProps {
  forwardedRef?: React.Ref<HTMLButtonElement>;
  triggerRef?: React.Ref<HTMLButtonElement>;
  id?: string;
  disabled?: boolean;
  open: boolean;
  ariaLabel: string;
  className?: string;
  hasValue: boolean;
  displayLabel: string;
  showClear: boolean;
  onToggleOpen: () => void;
  onClear: (e?: React.MouseEvent) => void;
  clearLabel?: string;
}

export function DateInputTrigger({
  forwardedRef,
  triggerRef,
  id,
  disabled,
  open,
  ariaLabel,
  className,
  hasValue,
  displayLabel,
  showClear,
  onToggleOpen,
  onClear,
  clearLabel = "Clear selection",
}: Readonly<DateInputTriggerProps>) {
  return (
    <button
      ref={mergeRefs(forwardedRef, triggerRef)}
      id={id}
      type="button"
      disabled={disabled}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={ariaLabel}
      onClick={() => {
        if (!disabled) onToggleOpen();
      }}
      className={cn(
        "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent/40 focus:border-primary focus:ring-4 focus:ring-ring/15 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        !hasValue && "text-muted-foreground",
        className,
      )}
    >
      <div className="flex items-center gap-2 truncate overflow-hidden">
        <CalendarIcon
          className="size-4 shrink-0 opacity-60"
          aria-hidden="true"
        />
        <span className="truncate">{displayLabel}</span>
      </div>

      <div className="flex items-center gap-1">
        {showClear && hasValue && !disabled && (
          <span
            role="button"
            tabIndex={0}
            aria-label={clearLabel}
            onClick={onClear}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onClear();
            }}
            className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
          </span>
        )}
      </div>
    </button>
  );
}
