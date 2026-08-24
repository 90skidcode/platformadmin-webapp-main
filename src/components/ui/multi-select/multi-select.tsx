"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { Badge } from "../badge";
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

export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  onBlur?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export const MultiSelect = React.forwardRef<
  HTMLButtonElement,
  MultiSelectProps
>(
  (
    {
      options,
      value: valueProp,
      defaultValue,
      onValueChange,
      placeholder = "Select options...",
      searchable = false,
      searchPlaceholder = "Search options...",
      disabled = false,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      className,
      id,
      name,
      "aria-label": ariaLabel,
      "aria-describedby": ariaDescribedBy,
      onBlur,
      onClick,
    },
    forwardedRef,
  ) => {
    const [selectedValues, setSelectedValues] = useControllableState<string[]>({
      value: valueProp,
      defaultValue: defaultValue ?? [],
      onChange: onValueChange,
    });

    const [open, setOpen] = useControllableState({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    });

    const [searchQuery, setSearchQuery] = React.useState("");

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const triggerButtonRef = React.useRef<HTMLButtonElement | null>(null);
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const searchInputRef = React.useRef<HTMLInputElement | null>(null);
    const listboxId = React.useId();

    const { rendered, nodeRef } = usePresence(open);

    const close = React.useCallback(
      (refocusTrigger: boolean) => {
        setOpen(false);
        setSearchQuery("");
        if (refocusTrigger) {
          triggerButtonRef.current?.focus();
        }
      },
      [setOpen],
    );

    useEscapeKey(() => close(true), open);
    useOutsideClick([containerRef, contentRef], () => close(false), open);

    const style = usePopoverPosition(rendered, containerRef, contentRef, {
      side: "bottom",
      align: "start",
      sideOffset: 4,
    });

    const currentValues = React.useMemo(
      () => selectedValues ?? [],
      [selectedValues],
    );

    const toggleOption = React.useCallback(
      (val: string) => {
        if (disabled) return;
        const exists = currentValues.includes(val);
        const next = exists
          ? currentValues.filter((item) => item !== val)
          : [...currentValues, val];
        setSelectedValues(next);
      },
      [currentValues, disabled, setSelectedValues],
    );

    const removeOption = React.useCallback(
      (val: string, event?: React.MouseEvent | React.KeyboardEvent) => {
        event?.stopPropagation();
        if (disabled) return;
        setSelectedValues(currentValues.filter((item) => item !== val));
      },
      [currentValues, disabled, setSelectedValues],
    );

    const clearAll = React.useCallback(
      (event?: React.MouseEvent | React.KeyboardEvent) => {
        event?.stopPropagation();
        if (disabled) return;
        setSelectedValues([]);
      },
      [disabled, setSelectedValues],
    );

    const filteredOptions = React.useMemo(() => {
      if (!searchQuery.trim()) return options;
      const query = searchQuery.toLowerCase();
      return options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(query) ||
          opt.value.toLowerCase().includes(query),
      );
    }, [options, searchQuery]);

    // Auto-focus search input or first option when opened
    React.useEffect(() => {
      if (!rendered) return;
      if (searchable) {
        searchInputRef.current?.focus();
      } else {
        const container = contentRef.current;
        container?.querySelector<HTMLElement>(OPTION_SELECTOR)?.focus();
      }
    }, [rendered, searchable]);

    function handleTriggerKeyDown(
      event: React.KeyboardEvent<HTMLButtonElement>,
    ) {
      if (disabled) return;
      if (
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        setOpen(true);
      }
    }

    function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const container = contentRef.current;
        if (!container) return;
        const firstOption =
          container.querySelector<HTMLElement>(OPTION_SELECTOR);
        firstOption?.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    }

    function handleEmptyListKeyDown(
      event: React.KeyboardEvent<HTMLDivElement>,
    ) {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      } else if (event.key === "ArrowUp" && searchable) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    function handleArrowNavigation(
      key: "ArrowDown" | "ArrowUp",
      currentIndex: number,
      optionElements: HTMLElement[],
    ) {
      if (key === "ArrowDown") {
        const nextIndex =
          currentIndex === -1 ? 0 : (currentIndex + 1) % optionElements.length;
        optionElements[nextIndex]?.focus();
        return;
      }

      if (currentIndex <= 0 && searchable) {
        searchInputRef.current?.focus();
      } else {
        const prevIndex =
          currentIndex > 0 ? currentIndex - 1 : optionElements.length - 1;
        optionElements[prevIndex]?.focus();
      }
    }

    function handleListKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
      const container = contentRef.current;
      if (!container) return;

      const optionElements = Array.from(
        container.querySelectorAll<HTMLElement>(OPTION_SELECTOR),
      );

      if (optionElements.length === 0) {
        handleEmptyListKeyDown(event);
        return;
      }

      const currentIndex = optionElements.indexOf(
        document.activeElement as HTMLElement,
      );

      switch (event.key) {
        case "ArrowDown":
        case "ArrowUp":
          event.preventDefault();
          handleArrowNavigation(event.key, currentIndex, optionElements);
          break;
        case "Home":
          event.preventDefault();
          optionElements[0]?.focus();
          break;
        case "End":
          event.preventDefault();
          optionElements.at(-1)?.focus();
          break;
        case "Escape":
          event.preventDefault();
          close(true);
          break;
        case "Tab":
          close(false);
          break;
      }
    }

    const selectedOptionsMap = React.useMemo(() => {
      const map = new Map<string, string>();
      for (const opt of options) {
        map.set(opt.value, opt.label);
      }
      return map;
    }, [options]);

    return (
      <div className="relative w-full">
        <div
          ref={containerRef}
          className={cn(
            "flex min-h-10 w-full cursor-pointer items-center justify-between gap-1.5 rounded-lg border border-input bg-background p-1 text-sm text-foreground shadow-sm transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-ring/15",
            disabled && "cursor-not-allowed opacity-50",
            className,
          )}
          onClick={() => {
            if (!disabled) {
              triggerButtonRef.current?.focus();
              setOpen(!open);
            }
          }}
        >
          <div className="flex flex-1 flex-wrap items-center gap-1.5 px-1.5 py-0.5">
            {currentValues.map((val) => {
              const label = selectedOptionsMap.get(val) ?? val;
              return (
                <Badge
                  key={val}
                  variant="secondary"
                  className="inline-flex items-center gap-1 pr-1"
                >
                  <span>{label}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${label}`}
                    disabled={disabled}
                    onClick={(e) => removeOption(val, e)}
                    className="flex size-3.5 items-center justify-center rounded-xs transition-opacity hover:opacity-75 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </Badge>
              );
            })}

            <button
              ref={mergeRefs(forwardedRef, triggerButtonRef)}
              id={id}
              name={name}
              type="button"
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-label={ariaLabel}
              aria-describedby={ariaDescribedBy}
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation();
                onClick?.(event);
                if (!event.defaultPrevented && !disabled) {
                  setOpen(!open);
                }
              }}
              onBlur={onBlur}
              onKeyDown={handleTriggerKeyDown}
              className={cn(
                "flex-1 cursor-pointer bg-transparent text-left outline-none",
                currentValues.length === 0
                  ? "py-1 text-muted-foreground"
                  : "min-w-4",
              )}
            >
              {currentValues.length === 0 && placeholder}
            </button>
          </div>

          {currentValues.length > 0 && (
            <button
              type="button"
              aria-label="Clear all selected options"
              disabled={disabled}
              onClick={clearAll}
              className="shrink-0 rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none"
            >
              Clear all
            </button>
          )}

          <span
            aria-hidden="true"
            className="pointer-events-none flex size-7 shrink-0 items-center justify-center pr-1 text-muted-foreground"
          >
            <ChevronDown className="size-4 opacity-50" aria-hidden="true" />
          </span>
        </div>

        {rendered && (
          <Portal>
            <div
              ref={mergeRefs(contentRef, nodeRef)}
              style={style}
              data-state={open ? "open" : "closed"}
              className="relative z-popover flex max-h-96 min-w-48 flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md"
            >
              {searchable && (
                <div className="flex items-center border-b border-border px-3 py-2">
                  <Search
                    className="mr-2 size-4 shrink-0 opacity-50"
                    aria-hidden="true"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    role="searchbox"
                    aria-label="Search options"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={searchPlaceholder}
                    className="flex h-6 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              )}

              <div
                id={listboxId}
                role="listbox"
                aria-multiselectable="true"
                tabIndex={-1}
                onKeyDown={handleListKeyDown}
                className="flex max-h-64 flex-col gap-0.5 overflow-auto p-1"
              >
                {filteredOptions.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No options found.
                  </div>
                ) : (
                  filteredOptions.map((option) => {
                    const isSelected = currentValues.includes(option.value);
                    const isOptionDisabled = option.disabled || disabled;

                    return (
                      <div
                        key={option.value}
                        role="option"
                        tabIndex={-1}
                        aria-selected={isSelected}
                        aria-disabled={isOptionDisabled ? true : undefined}
                        data-disabled={isOptionDisabled ? "" : undefined}
                        onClick={() => {
                          if (!isOptionDisabled) {
                            toggleOption(option.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (isOptionDisabled) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleOption(option.value);
                          }
                        }}
                        className={cn(
                          "relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input bg-background",
                          )}
                          aria-hidden="true"
                        >
                          {isSelected && <Check className="size-3" />}
                        </div>
                        <span className="flex-1">{option.label}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </Portal>
        )}
      </div>
    );
  },
);

MultiSelect.displayName = "MultiSelect";
