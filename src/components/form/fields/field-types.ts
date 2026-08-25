import type { FieldValues, UseFormReturn } from "react-hook-form";

import type { ApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import type { FieldHandlers, FieldState, FormField } from "../types";

export interface FieldComponentProps {
  field: FormField;
  form: UseFormReturn<FieldValues>;
  translate: (key: string) => string;
  apiFetcher: ApiFetcher;
  /** Optional sink for a field's raw DOM events (click, keyup, focus, ...).
   * The JSON schema can't carry function values, so this is how a consumer
   * (e.g. a debug/demo page) observes them instead of the schema. */
  onFieldEvent?: (
    fieldName: string,
    eventType: string,
    detail?: string,
  ) => void;
  /** Registry `field.onKeyUp` resolves against -- see FieldHandlers. */
  fieldHandlers?: FieldHandlers;
  /** This field's disabled/error state as last set by some *other* field's
   * handler (via `setFieldState` below) -- merged with this field's own
   * local disabled/error. Lives in FormRenderer, not here: several fields
   * can set the same target, and a field doesn't own state some other
   * field's handler wrote into it. */
  externalState?: FieldState;
  /** Lets this field's own handler set *another* field's state. */
  setFieldState?: (fieldName: string, state: FieldState) => void;
}
