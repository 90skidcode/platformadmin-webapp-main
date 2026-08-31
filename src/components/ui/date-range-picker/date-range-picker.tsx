"use client";

import * as React from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";
import {
  Portal,
  mergeRefs,
  useControllableState,
  useEscapeKey,
  useOutsideClick,
  usePopoverPosition,
} from "../primitives";
import {
  addMonths,
  formatDateDisplay,
  formatDateIso,
  getDaysInMonth,
  getDefaultPresets,
  getFirstDayOffset,
  isAfterDay,
  isBeforeDay,
  isSameDay,
  isWithinRange,
  parseDate,
  startOfDay,
} from "./date-utils";
import type { DateRange, DateRangePickerProps, DateRangePreset } from "./types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES_SUN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAY_NAMES_MON = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

interface PopoverContentProps {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  align: "start" | "center" | "end";
  numberOfMonths: 1 | 2;
  weekStartsOn: 0 | 1;
  showPresets: boolean;
  presets: DateRangePreset[];
  initialMonth: Date;
  selectedFrom: Date | null;
  selectedTo: Date | null;
  onSelectRange: (range: DateRange) => void;
  onClear: () => void;
  isDateDisabled: (date: Date) => boolean;
  isDateHidden: (date: Date) => boolean;
  hasValue: boolean;
}

function DateRangePopoverContent({
  triggerRef,
  onClose,
  align,
  numberOfMonths,
  weekStartsOn,
  showPresets,
  presets,
  initialMonth,
  selectedFrom,
  selectedTo,
  onSelectRange,
  onClear,
  isDateDisabled,
  isDateHidden,
  hasValue,
}: Readonly<PopoverContentProps>) {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [currentMonth, setCurrentMonth] = React.useState<Date>(initialMonth);

  // Temporary selection states
  const [tempFrom, setTempFrom] = React.useState<Date | null>(selectedFrom);
  const [tempTo, setTempTo] = React.useState<Date | null>(selectedTo);
  const [hoverDate, setHoverDate] = React.useState<Date | null>(null);

  const popoverStyle = usePopoverPosition(true, triggerRef, contentRef, {
    side: "bottom",
    align,
    sideOffset: 6,
  });

  useEscapeKey(onClose, true);
  const outsideRefs = React.useMemo(
    () => [triggerRef, contentRef],
    [triggerRef],
  );
  useOutsideClick(outsideRefs, onClose, true);

  const today = startOfDay(new Date());
  const weekdays = weekStartsOn === 1 ? WEEKDAY_NAMES_MON : WEEKDAY_NAMES_SUN;

  function handleDateClick(date: Date) {
    if (isDateDisabled(date)) return;

    if (!tempFrom || (tempFrom && tempTo)) {
      setTempFrom(date);
      setTempTo(null);
    } else if (tempFrom && !tempTo) {
      if (isBeforeDay(date, tempFrom)) {
        setTempFrom(date);
        setTempTo(null);
      } else {
        setTempTo(date);
        onSelectRange({
          from: formatDateIso(tempFrom),
          to: formatDateIso(date),
        });
        onClose();
      }
    }
  }

  function handleApplyPreset(range: { from: Date; to: Date }) {
    onSelectRange({
      from: formatDateIso(range.from),
      to: formatDateIso(range.to),
    });
    setTempFrom(range.from);
    setTempTo(range.to);
    onClose();
  }

  function renderMonthPane(monthDate: Date, monthIndex: number) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOffset = getFirstDayOffset(year, month, weekStartsOn);

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOffset; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    const activeStart = tempFrom;
    let activeEnd = tempTo;
    if (tempFrom && !tempTo && hoverDate && isAfterDay(hoverDate, tempFrom)) {
      activeEnd = hoverDate;
    }

    return (
      <div key={`${year}-${month}`} className="flex flex-col gap-2 p-2">
        <div className="flex items-center justify-between gap-1 px-1">
          {monthIndex === 0 ? (
            <button
              type="button"
              onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))}
              aria-label="Previous month"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <div className="size-7" />
          )}

          <div className="text-sm font-semibold">
            {MONTH_NAMES[month]} {year}
          </div>

          {monthIndex === numberOfMonths - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
              aria-label="Next month"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <div className="size-7" />
          )}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {weekdays.map((wd) => (
            <div key={wd} className="flex h-7 items-center justify-center">
              {wd}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="size-8" />;
            }

            const date = new Date(year, month, day);
            const isDisabled = isDateDisabled(date);
            const isHidden = isDateHidden(date);

            if (isHidden) {
              return <div key={`hidden-${day}`} className="size-8" />;
            }

            const isStart = activeStart ? isSameDay(date, activeStart) : false;
            const isEnd = activeEnd ? isSameDay(date, activeEnd) : false;
            const isInRange =
              activeStart && activeEnd
                ? isWithinRange(date, activeStart, activeEnd)
                : false;
            const isCurrentDay = isSameDay(date, today);

            return (
              <button
                key={`day-${day}`}
                type="button"
                disabled={isDisabled}
                onClick={() => handleDateClick(date)}
                onMouseEnter={() => {
                  if (tempFrom && !tempTo && !isDisabled) {
                    setHoverDate(date);
                  }
                }}
                aria-label={`${date.toDateString()}${isStart ? " (Start Date)" : ""}${isEnd ? " (End Date)" : ""}`}
                aria-pressed={isStart || isEnd || isInRange}
                className={cn(
                  "relative flex size-8 items-center justify-center text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  !isStart &&
                    !isEnd &&
                    !isInRange &&
                    "rounded-md hover:bg-accent hover:text-accent-foreground",
                  isCurrentDay &&
                    !isStart &&
                    !isEnd &&
                    "border border-primary font-bold text-primary",
                  isStart &&
                    "rounded-l-md bg-primary font-semibold text-primary-foreground shadow-sm",
                  isEnd &&
                    "rounded-r-md bg-primary font-semibold text-primary-foreground shadow-sm",
                  isStart && isEnd && "rounded-md",
                  isInRange &&
                    !isStart &&
                    !isEnd &&
                    "rounded-none bg-accent/70 text-accent-foreground",
                  isDisabled &&
                    "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-inherit",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Portal>
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-label="Date Range Calendar"
        style={popoverStyle}
        className="relative z-popover flex flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl md:flex-row"
      >
        {showPresets && presets.length > 0 && (
          <div className="flex min-w-36 flex-col gap-1 border-b border-border bg-muted/20 p-3 md:border-r md:border-b-0">
            <span className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Presets
            </span>
            {presets.map((preset) => (
              <button
                key={preset.id ?? preset.label}
                type="button"
                onClick={() => handleApplyPreset(preset.range())}
                className="rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {preset.label}
              </button>
            ))}
            {hasValue && (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  onClose();
                }}
                className="mt-1 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Clear Range
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 p-2 md:flex-row">
          {Array.from({ length: numberOfMonths }).map((_, idx) =>
            renderMonthPane(addMonths(currentMonth, idx), idx),
          )}
        </div>
      </div>
    </Portal>
  );
}

export const DateRangePicker = React.forwardRef<
  HTMLButtonElement,
  DateRangePickerProps
>(
  (
    {
      value: valueProp,
      defaultValue,
      onChange,
      minDate: minDateProp,
      maxDate: maxDateProp,
      disablePast = false,
      disableFuture = false,
      hidePastDates = false,
      isDateDisabled,
      placeholder = "Pick a date range",
      disabled = false,
      className,
      align = "start",
      numberOfMonths = 2,
      weekStartsOn = 0,
      showPresets = true,
      presets: customPresets,
      formatDisplay,
      showClear = true,
      open: openProp,
      onOpenChange,
      id,
      "aria-label": ariaLabel,
    },
    forwardedRef,
  ) => {
    const [range, setRange] = useControllableState<DateRange | undefined>({
      value: valueProp,
      defaultValue: defaultValue ?? { from: null, to: null },
      onChange: (next) => {
        if (next) onChange?.(next);
      },
    });

    const [open, setOpen] = useControllableState({
      value: openProp,
      defaultValue: false,
      onChange: onOpenChange,
    });

    const triggerRef = React.useRef<HTMLButtonElement | null>(null);

    const parsedFrom = parseDate(range?.from);
    const parsedTo = parseDate(range?.to);
    const minDate = parseDate(minDateProp);
    const maxDate = parseDate(maxDateProp);
    const today = startOfDay(new Date());

    const initialMonth = parsedFrom ?? minDate ?? today;
    const presets = customPresets ?? getDefaultPresets();

    function checkDateDisabled(date: Date): boolean {
      if (disablePast && isBeforeDay(date, today)) return true;
      if (disableFuture && isAfterDay(date, today)) return true;
      if (minDate && isBeforeDay(date, minDate)) return true;
      if (maxDate && isAfterDay(date, maxDate)) return true;
      if (isDateDisabled && isDateDisabled(date)) return true;
      return false;
    }

    function checkDateHidden(date: Date): boolean {
      return Boolean(hidePastDates && isBeforeDay(date, today));
    }

    function handleClear(e?: React.MouseEvent) {
      e?.stopPropagation();
      setRange({ from: null, to: null });
    }

    function renderDisplayLabel(): string {
      if (formatDisplay && range) {
        return formatDisplay(range);
      }
      if (parsedFrom && parsedTo) {
        if (isSameDay(parsedFrom, parsedTo)) {
          return formatDateDisplay(parsedFrom);
        }
        return `${formatDateDisplay(parsedFrom)} – ${formatDateDisplay(parsedTo)}`;
      }
      if (parsedFrom) {
        return `${formatDateDisplay(parsedFrom)} – ...`;
      }
      return placeholder;
    }

    const hasValue = !!(parsedFrom || parsedTo);

    return (
      <div className="relative inline-block w-full">
        <button
          ref={mergeRefs(forwardedRef, triggerRef)}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={ariaLabel ?? "Select date range"}
          onClick={() => {
            if (!disabled) setOpen(!open);
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
            <span className="truncate">{renderDisplayLabel()}</span>
          </div>

          <div className="flex items-center gap-1">
            {showClear && hasValue && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear date range"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleClear();
                }}
                className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden="true" />
              </span>
            )}
          </div>
        </button>

        {open && (
          <DateRangePopoverContent
            triggerRef={triggerRef}
            onClose={() => setOpen(false)}
            align={align}
            numberOfMonths={numberOfMonths}
            weekStartsOn={weekStartsOn}
            showPresets={showPresets}
            presets={presets}
            initialMonth={initialMonth}
            selectedFrom={parsedFrom}
            selectedTo={parsedTo}
            onSelectRange={setRange}
            onClear={handleClear}
            isDateDisabled={checkDateDisabled}
            isDateHidden={checkDateHidden}
            hasValue={hasValue}
          />
        )}
      </div>
    );
  },
);

DateRangePicker.displayName = "DateRangePicker";
