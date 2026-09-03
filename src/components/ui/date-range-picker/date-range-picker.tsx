"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { Portal, useControllableState } from "../primitives";
import { DateInputTrigger, usePopoverPanel } from "./date-trigger";
import {
  MONTH_NAMES,
  addMonths,
  formatDateDisplay,
  formatDateIso,
  getDefaultPresets,
  getMonthDays,
  getWeekdays,
  isAfterDay,
  isBeforeDay,
  isDateHiddenHelper,
  isDateUnavailable,
  isMonthAfter,
  isSameDay,
  isWithinRange,
  parseDate,
  startOfDay,
} from "./date-utils";
import type { DateRange, DateRangePickerProps, DateRangePreset } from "./types";

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

interface DayCellProps {
  day: number | null;
  idx: number;
  year: number;
  month: number;
  today: Date;
  activeStart: Date | null;
  activeEnd: Date | null;
  tempFrom: Date | null;
  tempTo: Date | null;
  isDateDisabled: (date: Date) => boolean;
  isDateHidden: (date: Date) => boolean;
  onDateClick: (date: Date) => void;
  onHoverDate: (date: Date) => void;
}

function getDayButtonClass({
  isStart,
  isEnd,
  isInRange,
  isCurrentDay,
  isDisabled,
}: {
  isStart: boolean;
  isEnd: boolean;
  isInRange: boolean;
  isCurrentDay: boolean;
  isDisabled: boolean;
}) {
  const base =
    "relative flex size-8 items-center justify-center text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

  if (isDisabled) {
    return cn(
      base,
      "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-inherit",
    );
  }
  if (isStart && isEnd) {
    return cn(
      base,
      "rounded-md bg-primary font-semibold text-primary-foreground shadow-sm",
    );
  }
  if (isStart) {
    return cn(
      base,
      "rounded-l-md bg-primary font-semibold text-primary-foreground shadow-sm",
    );
  }
  if (isEnd) {
    return cn(
      base,
      "rounded-r-md bg-primary font-semibold text-primary-foreground shadow-sm",
    );
  }
  if (isInRange) {
    return cn(base, "rounded-none bg-accent/70 text-accent-foreground");
  }
  if (isCurrentDay) {
    return cn(
      base,
      "rounded-md border border-primary font-bold text-primary hover:bg-accent hover:text-accent-foreground",
    );
  }
  return cn(base, "rounded-md hover:bg-accent hover:text-accent-foreground");
}

function isDayDisabled(
  date: Date,
  tempFrom: Date | null,
  tempTo: Date | null,
  isDateDisabled: (d: Date) => boolean,
): boolean {
  if (isDateDisabled(date)) return true;
  if (tempFrom && !tempTo && isBeforeDay(date, tempFrom)) return true;
  return false;
}

function DayCell({
  day,
  idx,
  year,
  month,
  today,
  activeStart,
  activeEnd,
  tempFrom,
  tempTo,
  isDateDisabled,
  isDateHidden,
  onDateClick,
  onHoverDate,
}: Readonly<DayCellProps>) {
  if (day === null) {
    return <div key={`empty-${idx}`} className="size-8" />;
  }

  const date = new Date(year, month, day);
  if (isDateHidden(date)) {
    return <div key={`hidden-${day}`} className="size-8" />;
  }

  const isDisabled = isDayDisabled(date, tempFrom, tempTo, isDateDisabled);
  const isStart = Boolean(activeStart && isSameDay(date, activeStart));
  const isEnd = Boolean(activeEnd && isSameDay(date, activeEnd));
  const isInRange = Boolean(
    activeStart && activeEnd && isWithinRange(date, activeStart, activeEnd),
  );
  const isCurrentDay = isSameDay(date, today);

  const className = getDayButtonClass({
    isStart,
    isEnd,
    isInRange,
    isCurrentDay,
    isDisabled,
  });

  return (
    <button
      key={`day-${day}`}
      type="button"
      disabled={isDisabled}
      onClick={() => onDateClick(date)}
      onMouseEnter={() => {
        if (tempFrom && !tempTo && !isDisabled) {
          onHoverDate(date);
        }
      }}
      aria-label={`${date.toDateString()}${isStart ? " (Start Date)" : ""}${isEnd ? " (End Date)" : ""}`}
      aria-pressed={isStart || isEnd || isInRange}
      className={className}
    >
      {day}
    </button>
  );
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
  const { contentRef, popoverStyle } = usePopoverPanel({
    triggerRef,
    align,
    onClose,
  });
  const [currentMonth, setCurrentMonth] = React.useState<Date>(initialMonth);

  // Temporary selection states
  const [tempFrom, setTempFrom] = React.useState<Date | null>(selectedFrom);
  const [tempTo, setTempTo] = React.useState<Date | null>(selectedTo);
  const [hoverDate, setHoverDate] = React.useState<Date | null>(null);

  const today = startOfDay(new Date());
  const weekdays = getWeekdays(weekStartsOn);

  function handleDateClick(date: Date) {
    if (isDateDisabled(date)) return;

    if (!tempFrom || (tempFrom && tempTo)) {
      setTempFrom(date);
      setTempTo(null);
    } else if (tempFrom && !tempTo) {
      if (isBeforeDay(date, tempFrom)) {
        return;
      }
      setTempTo(date);
      onSelectRange({
        from: formatDateIso(tempFrom),
        to: formatDateIso(date),
      });
      onClose();
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
    const days = getMonthDays(year, month, weekStartsOn);

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
          {days.map((day, idx) => (
            <DayCell
              key={`day-cell-${idx}`}
              day={day}
              idx={idx}
              year={year}
              month={month}
              today={today}
              activeStart={activeStart}
              activeEnd={activeEnd}
              tempFrom={tempFrom}
              tempTo={tempTo}
              isDateDisabled={isDateDisabled}
              isDateHidden={isDateHidden}
              onDateClick={handleDateClick}
              onHoverDate={setHoverDate}
            />
          ))}
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

    const initialMonth = React.useMemo(() => {
      let baseMonth = parsedFrom ?? minDate ?? today;
      if (numberOfMonths === 2) {
        if (disableFuture) {
          const nextMonth = addMonths(baseMonth, 1);
          if (isMonthAfter(nextMonth, today)) {
            baseMonth = addMonths(today, -1);
          }
        } else if (maxDate) {
          const nextMonth = addMonths(baseMonth, 1);
          if (isMonthAfter(nextMonth, maxDate)) {
            baseMonth = addMonths(maxDate, -1);
          }
        }
      }
      return baseMonth;
    }, [parsedFrom, minDate, maxDate, disableFuture, numberOfMonths, today]);

    const presets = customPresets ?? getDefaultPresets();

    function checkDateDisabled(date: Date): boolean {
      return isDateUnavailable({
        date,
        today,
        minDate,
        maxDate,
        disablePast,
        disableFuture,
        isDateDisabled,
      });
    }

    const checkDateHidden = (d: Date) =>
      isDateHiddenHelper(d, today, hidePastDates);

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
        <DateInputTrigger
          forwardedRef={forwardedRef}
          triggerRef={triggerRef}
          id={id}
          disabled={disabled}
          open={open}
          ariaLabel={ariaLabel ?? "Select date range"}
          className={className}
          hasValue={hasValue}
          displayLabel={renderDisplayLabel()}
          showClear={showClear}
          onToggleOpen={() => setOpen(!open)}
          onClear={handleClear}
          clearLabel="Clear date range"
        />

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
