import type { BaseDatePickerConfig } from "../date-range-picker/types";

export interface DatePickerPreset {
  label: string;
  date: () => Date;
  id?: string;
}

export interface DatePickerProps extends BaseDatePickerConfig {
  /** The currently selected date (ISO string 'YYYY-MM-DD' or Date instance or null). */
  value?: Date | string | null;
  /** Uncontrolled default date. */
  defaultValue?: Date | string | null;
  /** Callback fired when a date is selected or cleared. Returns ISO string 'YYYY-MM-DD' or null. */
  onChange?: (date: string | null) => void;
  /** Custom presets array. Defaults to standard presets (Today, Tomorrow, Yesterday). */
  presets?: DatePickerPreset[];
  /** Custom formatter function for the display text in the trigger. */
  formatDisplay?: (date: Date) => string;
}
