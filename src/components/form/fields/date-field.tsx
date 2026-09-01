import { Controller } from "react-hook-form";

import { DatePicker } from "@/components/ui";
import { FieldError } from "./field-error";
import { FieldLabel, resolveText } from "./field-label";
import type { FieldComponentProps } from "./field-types";

export function DateField({
  field,
  form,
  translate,
  apiFetcher,
  onFieldEvent,
  fieldHandlers,
  externalState,
  setFieldState,
}: Readonly<FieldComponentProps>) {
  const error = form.formState.errors[field.name]?.message as
    | string
    | undefined;
  const placeholder = resolveText(
    translate,
    field.placeholder,
    field.placeholderKey,
  );
  const errorId = `${field.name}-error`;
  const emit = (eventType: string, detail?: string) =>
    onFieldEvent?.(field.name, eventType, detail);

  const disabled = field.disabled || !!externalState?.disabled;
  const displayError = error ?? externalState?.error;
  const valueChangeHandler = field.onValueChange
    ? fieldHandlers?.[field.onValueChange]
    : undefined;

  if (externalState?.hidden) return null;

  return (
    <div className="grid gap-1.5">
      <FieldLabel field={field} translate={translate} />
      <Controller
        control={form.control}
        name={field.name}
        render={({ field: controllerField }) => (
          <DatePicker
            id={field.name}
            placeholder={placeholder}
            value={controllerField.value ?? null}
            minDate={field.minDate}
            maxDate={field.maxDate}
            disablePast={field.disablePast}
            disableFuture={field.disableFuture}
            hidePastDates={field.hidePastDates}
            showPresets={field.showPresets}
            disabled={disabled}
            aria-label={field.name}
            onChange={(nextDate) => {
              const valueStr = nextDate ?? "";
              emit("onValueChange", valueStr);
              controllerField.onChange(nextDate);
              if (valueChangeHandler && setFieldState) {
                valueChangeHandler(valueStr, {
                  setFieldState,
                  getValues: () => form.getValues(),
                  apiFetcher,
                });
              }
            }}
          />
        )}
      />
      <FieldError id={errorId} message={displayError} translate={translate} />
    </div>
  );
}
