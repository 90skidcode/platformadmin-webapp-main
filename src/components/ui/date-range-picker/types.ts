export interface DateRange {
  from?: Date | string | null;
  to?: Date | string | null;
}

export interface DateRangePreset {
  id?: string;
  label: string;
  range: () => { from: Date; to: Date };
}

export interface DateRangePickerProps {
  /** Current selected range */
  value?: DateRange;
  /** Default range for uncontrolled mode */
  defaultValue?: DateRange;
  /** Callback fired when date range changes */
  onChange?: (range: DateRange) => void;
  /** Earliest selectable date */
  minDate?: Date | string;
  /** Latest selectable date */
  maxDate?: Date | string;
  /** Whether past dates (before today) are disabled */
  disablePast?: boolean;
  /** Whether future dates (after today) are disabled */
  disableFuture?: boolean;
  /** Whether past dates should be hidden / invisible in the calendar */
  hidePastDates?: boolean;
  /** Custom function to disable specific dates */
  isDateDisabled?: (date: Date) => boolean;
  /** Placeholder text when no range is selected */
  placeholder?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Additional CSS class names for the trigger button */
  className?: string;
  /** Popover alignment relative to trigger */
  align?: "start" | "center" | "end";
  /** Number of months shown side-by-side (1 or 2, default: 2 on desktop) */
  numberOfMonths?: 1 | 2;
  /** First day of the week: 0 = Sunday, 1 = Monday (default: 0) */
  weekStartsOn?: 0 | 1;
  /** Show quick preset buttons (Today, Last 7 Days, This Month, etc.) */
  showPresets?: boolean;
  /** Custom preset list */
  presets?: DateRangePreset[];
  /** Custom display formatter for the trigger */
  formatDisplay?: (range: DateRange) => string;
  /** Whether to show a clear button on the trigger */
  showClear?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** ID for accessibility */
  id?: string;
  /** Accessible label */
  "aria-label"?: string;
}
