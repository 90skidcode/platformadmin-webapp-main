import type { ActionResultConfig } from "@/lib/action-handlers/action-result";
import type { ApiFetcher } from "@/lib/fetcher/use-api-fetcher";

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
  | "date-range"
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

/**
 * State imperatively set on some *other* field, e.g. once an async lookup
 * resolves. Every property is independent -- pass only the ones you're
 * changing; omitted ones are left alone (explicit `undefined` on a
 * property that was previously set clears just that property, e.g.
 * `{ error: undefined }` to clear an error while leaving `disabled` as-is).
 *
 * What's applicable, and how each is actually applied (see FormRenderer's
 * `setFieldState`):
 * - `value` -- routed through react-hook-form's own `setValue`, so it
 *   participates in validation/dirty-tracking/submission exactly like a
 *   real edit would. Not merged/remembered here -- RHF is already the
 *   source of truth for values, this would just be a second, conflicting
 *   copy of it.
 * - `disabled` / `error` -- kept here (FormRenderer's `fieldStates`) and
 *   merged into the field's own local disabled/error on every render.
 *   UI-only -- doesn't affect `schema-to-zod`'s validation shape, so a
 *   field can be marked `error` here while still passing zod validation.
 * - `hidden` -- same "kept here, merged in" treatment as disabled/error.
 *   Hides the field's control from the page while its react-hook-form
 *   registration (and therefore value/validation) stays intact -- the same
 *   "still part of the form, just not shown" idea `type: "hidden"` fields
 *   already have, applied on demand instead of always.
 * - `focus` -- one-shot: moves keyboard focus to the field immediately
 *   (via react-hook-form's own `setFocus`) and is then forgotten, not
 *   retained -- there's no persistent "is focused" state to merge back in
 *   on the next render, unlike the properties above. Think twice before
 *   firing this from a debounced/async handler: it steals focus out from
 *   under whatever the user is doing the instant the response arrives,
 *   which reads as broken if they've since moved on to typing elsewhere.
 *
 * Deliberately not here: dynamic `required`/validation-rule changes, or
 * swapping a `select` field's `optionsSource` at runtime. Both are real,
 * fairly common needs (e.g. a country field narrowing a state dropdown's
 * options) but need `schema-to-zod`/`SelectField` changes of their own,
 * not just another property on this bag -- ask if you need either.
 */
export interface FieldState {
  value?: unknown;
  disabled?: boolean;
  error?: string;
  hidden?: boolean;
  focus?: boolean;
}

/** What a `FieldHandler` gets alongside the field's own value: a way to act
 * on the rest of the form instead of just itself. */
export interface FieldHandlerContext {
  /** Imperatively set another field's state by name -- see FieldState for
   * what's applicable and how each property behaves. */
  setFieldState: (fieldName: string, state: FieldState) => void;
  /** This form's current values, e.g. to build an API request. */
  getValues: () => Record<string, unknown>;
  apiFetcher: ApiFetcher;
}

/** A field's own event-handler key (`onKeyUp`, currently) resolves to one
 * of these -- same registry-by-name shape as `FormAction.onClick` into
 * `actionHandlers`. Free to be async (an API call, a debounce, ...) and to
 * touch any other field via `ctx.setFieldState`, unlike `schema-to-zod`
 * validation, which only ever judges a field against itself. */
export type FieldHandler = (
  value: string,
  ctx: FieldHandlerContext,
) => void | Promise<void>;

/** Key into the consumer-supplied `fieldHandlers` registry (FormRenderer
 * prop), resolved the same way `actionHandlers` resolves `FormAction.onClick`. */
export type FieldHandlers = Record<string, FieldHandler>;

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
  /** Key into the consumer-supplied `fieldHandlers` registry -- called with
   * this field's current value on keyup. `text`/`email`/`password`/`number`
   * only, currently (see FieldHandler). */
  onKeyUp?: string;
  /** Key into the consumer-supplied `fieldHandlers` registry -- called with
   * the newly-selected value once the user picks an option. `select` only.
   * Not `onSelect`: that name is already the native text-selection DOM
   * event other field types log (see TextField/TextareaField) -- reusing
   * it here for a dropdown's "option chosen" moment would mean the same
   * property name means two unrelated events depending on field type. This
   * one matches `Select`'s own callback prop name instead (see
   * ui/select.tsx's `onValueChange`), so there's exactly one thing it
   * could mean. */
  onValueChange?: string;
  /** Key into the consumer-supplied `fieldHandlers` registry -- called once
   * the user toggles it. `checkbox`/`switch` only. Matches `Checkbox`'s and
   * `Switch`'s own callback prop name (see ui/checkbox.tsx, ui/switch.tsx),
   * same reasoning as `onValueChange` above. `FieldHandler.value` stays
   * `string` for every handler key, so the checked boolean arrives
   * stringified (`"true"`/`"false"`) -- the same stringification the event
   * log already does for this control's onCheckedChange entries. */
  onCheckedChange?: string;
  /** Earliest selectable date boundary for date / date-range fields. */
  minDate?: string;
  /** Latest selectable date boundary for date / date-range fields. */
  maxDate?: string;
  /** Disables any dates before today for date / date-range fields. */
  disablePast?: boolean;
  /** Disables any dates after today for date / date-range fields. */
  disableFuture?: boolean;
  /** Hides dates before today completely from the calendar view. */
  hidePastDates?: boolean;
  /** Whether to show quick presets panel. Default: true. */
  showPresets?: boolean;
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
