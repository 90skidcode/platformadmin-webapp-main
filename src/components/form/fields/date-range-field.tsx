import { Controller } from "react-hook-form";

import { DateRangePicker, type DateRange } from "@/components/ui";
import { FieldError } from "./field-error";
import { FieldLabel, resolveText } from "./field-label";
import type { FieldComponentProps } from "./field-types";

export function DateRangeField({
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
        render={({ field: controllerField }) => {
          const rawValue = controllerField.value as
            | DateRange
            | string
            | null
            | undefined;
          let rangeValue: DateRange = { from: null, to: null };
          if (rawValue && typeof rawValue === "object") {
            rangeValue = rawValue;
          } else if (typeof rawValue === "string" && rawValue.includes(":")) {
            const [f, t] = rawValue.split(":");
            rangeValue = { from: f || null, to: t || null };
          }

          return (
            <DateRangePicker
              id={field.name}
              placeholder={placeholder}
              value={rangeValue}
              minDate={field.minDate}
              maxDate={field.maxDate}
              disablePast={field.disablePast}
              disableFuture={field.disableFuture}
              hidePastDates={field.hidePastDates}
              showPresets={field.showPresets}
              disabled={disabled}
              aria-label={field.name}
              onChange={(nextRange) => {
                const fromStr =
                  nextRange.from instanceof Date
                    ? nextRange.from.toISOString().slice(0, 10)
                    : (nextRange.from ?? "");
                const toStr =
                  nextRange.to instanceof Date
                    ? nextRange.to.toISOString().slice(0, 10)
                    : (nextRange.to ?? "");

                const formattedStr =
                  fromStr && toStr ? `${fromStr}:${toStr}` : fromStr;

                emit("onValueChange", formattedStr);
                controllerField.onChange(nextRange);

                if (valueChangeHandler && setFieldState) {
                  valueChangeHandler(formattedStr, {
                    setFieldState,
                    getValues: () => form.getValues(),
                    apiFetcher,
                  });
                }
              }}
            />
          );
        }}
      />
      <FieldError id={errorId} message={displayError} translate={translate} />
    </div>
  );
}
