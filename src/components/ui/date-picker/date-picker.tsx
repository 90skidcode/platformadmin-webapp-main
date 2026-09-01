"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { Portal, useControllableState } from "../primitives";
import {
  DateInputTrigger,
  usePopoverPanel,
} from "../date-range-picker/date-trigger";
import {
  MONTH_NAMES,
  addMonths,
  formatDateDisplay,
  formatDateIso,
  getMonthDays,
  getWeekdays,
  isDateHiddenHelper,
  isDateUnavailable,
  isSameDay,
  parseDate,
  startOfDay,
} from "../date-range-picker/date-utils";
import type { DatePickerProps, DatePickerPreset } from "./types";

function getDefaultDatePickerPresets(): DatePickerPreset[] {
  const today = startOfDay(new Date());

  return [
    {
      id: "today",
      label: "Today",
      date: () => today,
    },
    {
      id: "tomorrow",
      label: "Tomorrow",
      date: () => {
        const d = new Date(today);
        d.setDate(d.getDate() + 1);
        return d;
      },
    },
    {
      id: "yesterday",
      label: "Yesterday",
      date: () => {
        const d = new Date(today);
        d.setDate(d.getDate() - 1);
        return d;
      },
    },
  ];
}

interface DatePickerPopoverContentProps {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  align: "start" | "center" | "end";
  weekStartsOn: 0 | 1;
  showPresets: boolean;
  presets: DatePickerPreset[];
  initialMonth: Date;
  selectedDate: Date | null;
  onSelectDate: (date: string | null) => void;
  isDateDisabled: (date: Date) => boolean;
  isDateHidden: (date: Date) => boolean;
}

function DatePickerPopoverContent({
  triggerRef,
  onClose,
  align,
  weekStartsOn,
  showPresets,
  presets,
  initialMonth,
  selectedDate,
  onSelectDate,
  isDateDisabled,
  isDateHidden,
}: Readonly<DatePickerPopoverContentProps>) {
  const { contentRef, popoverStyle } = usePopoverPanel({
    triggerRef,
    align,
    onClose,
  });
  const [currentMonth, setCurrentMonth] = React.useState<Date>(initialMonth);

  const today = startOfDay(new Date());
  const weekdays = getWeekdays(weekStartsOn);

  function handleDateClick(date: Date) {
    if (isDateDisabled(date)) return;
    onSelectDate(formatDateIso(date));
    onClose();
  }

  function handleApplyPreset(presetDate: Date) {
    if (isDateDisabled(presetDate)) return;
    onSelectDate(formatDateIso(presetDate));
    onClose();
  }

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const days = getMonthDays(year, month, weekStartsOn);

  return (
    <Portal>
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-label="Date Picker Calendar"
        style={popoverStyle}
        className="relative z-popover flex flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl md:flex-row"
      >
        {showPresets && presets.length > 0 && (
          <div className="flex min-w-36 flex-col gap-1 border-b border-border bg-muted/20 p-3 md:border-r md:border-b-0">
            <span className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Presets
            </span>
            {presets.map((preset) => {
              const pDate = preset.date();
              const isDisabled = isDateDisabled(pDate);
              return (
                <button
                  key={preset.id ?? preset.label}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleApplyPreset(pDate)}
                  className="rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-1 px-1">
            <button
              type="button"
              onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))}
              aria-label="Previous month"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>

            <div className="text-sm font-semibold">
              {MONTH_NAMES[month]} {year}
            </div>

            <button
              type="button"
              onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
              aria-label="Next month"
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
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

              const isSelected = selectedDate
                ? isSameDay(date, selectedDate)
                : false;
              const isCurrentDay = isSameDay(date, today);

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleDateClick(date)}
                  aria-label={`${date.toDateString()}${isSelected ? " (Selected)" : ""}`}
                  aria-pressed={isSelected}
                  className={cn(
                    "relative flex size-8 items-center justify-center rounded-md text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    !isSelected &&
                      "hover:bg-accent hover:text-accent-foreground",
                    isCurrentDay &&
                      !isSelected &&
                      "border border-primary font-bold text-primary",
                    isSelected &&
                      "bg-primary font-semibold text-primary-foreground shadow-sm",
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
      </div>
    </Portal>
  );
}

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
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
      placeholder = "Pick a date",
      disabled = false,
      className,
      align = "start",
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
    let normalizedValue: string | null | undefined;
    if (valueProp instanceof Date) {
      normalizedValue = formatDateIso(valueProp);
    } else if (valueProp !== undefined) {
      normalizedValue = valueProp;
    }

    let normalizedDefaultValue: string | null = null;
    if (defaultValue instanceof Date) {
      normalizedDefaultValue = formatDateIso(defaultValue);
    } else if (defaultValue) {
      normalizedDefaultValue = defaultValue;
    }

    const [selectedIso, setSelectedIso] = useControllableState<
      string | null | undefined
    >({
      value: normalizedValue,
      defaultValue: normalizedDefaultValue,
      onChange: (next) => {
        onChange?.(next ?? null);
      },
    });

    const [open, setOpen] = useControllableState({
      value: openProp,
      defaultValue: false,
      onChange: onOpenChange,
    });

    const triggerRef = React.useRef<HTMLButtonElement | null>(null);

    const parsedDate = parseDate(selectedIso);
    const minDate = parseDate(minDateProp);
    const maxDate = parseDate(maxDateProp);
    const today = startOfDay(new Date());

    const initialMonth = parsedDate ?? minDate ?? today;
    const presets = customPresets ?? getDefaultDatePickerPresets();

    const isTargetDateDisabled = (targetDate: Date) =>
      isDateUnavailable({
        date: targetDate,
        today,
        minDate,
        maxDate,
        disablePast,
        disableFuture,
        isDateDisabled,
      });

    const isTargetDateHidden = (targetDate: Date) =>
      isDateHiddenHelper(targetDate, today, hidePastDates);

    const handleClearSelection = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSelectedIso(null);
    };

    function renderDisplayLabel(): string {
      if (!parsedDate) return placeholder;
      if (formatDisplay) return formatDisplay(parsedDate);
      return formatDateDisplay(parsedDate);
    }

    const hasValue = !!parsedDate;

    return (
      <div className="relative inline-block w-full">
        <DateInputTrigger
          forwardedRef={forwardedRef}
          triggerRef={triggerRef}
          id={id}
          disabled={disabled}
          open={open}
          ariaLabel={ariaLabel ?? "Select date"}
          className={className}
          hasValue={hasValue}
          displayLabel={renderDisplayLabel()}
          showClear={showClear}
          onToggleOpen={() => setOpen(!open)}
          onClear={handleClearSelection}
          clearLabel="Clear date"
        />

        {open && (
          <DatePickerPopoverContent
            triggerRef={triggerRef}
            onClose={() => setOpen(false)}
            align={align}
            weekStartsOn={weekStartsOn}
            showPresets={showPresets}
            presets={presets}
            initialMonth={initialMonth}
            selectedDate={parsedDate}
            onSelectDate={setSelectedIso}
            isDateDisabled={isTargetDateDisabled}
            isDateHidden={isTargetDateHidden}
          />
        )}
      </div>
    );
  },
);

DatePicker.displayName = "DatePicker";
