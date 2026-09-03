export interface DateRange {
  from?: Date | string | null;
  to?: Date | string | null;
}

export interface DateRangePreset {
  id?: string;
  label: string;
  range: () => { from: Date; to: Date };
}

export interface BaseDatePickerConfig {
  /** Earliest selectable date boundary */
  minDate?: Date | string;
  /** Latest selectable date boundary */
  maxDate?: Date | string;
  /** Whether past dates (before today) are disabled */
  disablePast?: boolean;
  /** Whether future dates (after today) are disabled */
  disableFuture?: boolean;
  /** Whether past dates should be hidden / invisible in the calendar */
  hidePastDates?: boolean;
  /** Custom function to disable specific dates */
  isDateDisabled?: (date: Date) => boolean;
  /** Placeholder text when no value is selected */
  placeholder?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Additional CSS class names for the trigger button */
  className?: string;
  /** Popover alignment relative to trigger */
  align?: "start" | "center" | "end";
  /** First day of the week: 0 = Sunday, 1 = Monday (default: 0) */
  weekStartsOn?: 0 | 1;
  /** Show quick preset buttons */
  showPresets?: boolean;
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

export interface DateRangePickerProps extends BaseDatePickerConfig {
  /** Current selected range */
  value?: DateRange;
  /** Default range for uncontrolled mode */
  defaultValue?: DateRange;
  /** Callback fired when date range changes */
  onChange?: (range: DateRange) => void;
  /** Number of months shown side-by-side (1 or 2, default: 2 on desktop) */
  numberOfMonths?: 1 | 2;
  /** Custom preset list */
  presets?: DateRangePreset[];
  /** Custom display formatter for the trigger */
  formatDisplay?: (range: DateRange) => string;
}
