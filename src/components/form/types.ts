import type { ActionResultConfig } from "@/lib/action-handlers/action-result";

export type { ActionHandlers } from "@/lib/action-handlers/action-handlers";
export type {
  ActionResultConfig,
  ToastActionConfig,
} from "@/lib/action-handlers/action-result";

export type FormFieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "textarea"
  | "select"
  | "checkbox"
  | "switch"
  | "date"
  | "hidden";

export interface FieldValidationMessages {
  required?: string;
  min?: string;
  max?: string;
  minLength?: string;
  maxLength?: string;
  pattern?: string;
  email?: string;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  /** Regex source (not a RegExp literal -- schemas are JSON). */
  pattern?: string;
  /** Per-field i18n overrides for validation messages (plan §8). */
  messages?: FieldValidationMessages;
}

export interface FieldOption {
  value: string;
  label?: string;
  labelKey?: string;
}

export type OptionsSource =
  | { type: "static"; options: FieldOption[] }
  | {
      type: "remote";
      /** Resolved through the BFF proxy, exactly like an `endpoint.url` (plan §6). */
      url: string;
      valueKey?: string;
      labelKey?: string;
    };

export type FieldCondition = {
  field: string;
  condition: "valid" | "invalid";
};

export interface FormField {
  name: string;
  type: FormFieldType;
  label?: string;
  labelKey?: string;
  placeholder?: string;
  placeholderKey?: string;
  helpText?: string;
  helpTextKey?: string;
  defaultValue?: unknown;
  disabled?: boolean;
  /** Out of the schema's `layout.columns` grid, how many columns this field spans. */
  colSpan?: 1 | 2 | 3;
  validation?: FieldValidation;
  /** `select` only. */
  optionsSource?: OptionsSource;
  showIf?: FieldCondition;
  disabledIf?: FieldCondition;
}

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link";

export type FormActionType = "submit" | "reset" | "link" | "button";

export interface FormAction {
  id: string;
  type: FormActionType;
  label?: string;
  labelKey?: string;
  variant?: ButtonVariant;
  /** `submit` only -- the default REST call, skipped entirely when `onClick` is set (plan §7.1). */
  endpoint?: { method: "POST" | "PUT" | "PATCH"; url: string };
  /** `link` only. */
  href?: string;
  /** Key into the consumer-supplied `actionHandlers` registry (plan §9). */
  onClick?: string;
  onSuccess?: ActionResultConfig;
  onError?: ActionResultConfig;
  /** Gates visibility via `can()` (plan §5), same concept as table row/bulk actions. */
  permission?: string;
}

export interface FormSchema {
  id: string;
  /** Dot-path into the loaded message namespaces, e.g. "auth.login" (plan §4.5). */
  i18nNamespace?: string;
  layout?: { columns?: 1 | 2 | 3 };
  fields: FormField[];
  actions: FormAction[];
}
