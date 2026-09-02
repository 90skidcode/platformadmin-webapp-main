import { useRef } from "react";
import { Controller } from "react-hook-form";

import { OtpInput } from "@/components/ui";
import { FieldError } from "./field-error";
import { FieldLabel } from "./field-label";
import type { FieldComponentProps } from "./field-types";

export function OtpField({
  field,
  form,
  translate,
  apiFetcher,
  onFieldEvent,
  fieldHandlers,
  externalState,
  setFieldState,
}: Readonly<FieldComponentProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const error = form.formState.errors[field.name]?.message as
    | string
    | undefined;
  const errorId = `${field.name}-error`;

  const disabled = field.disabled || !!externalState?.disabled;
  const displayError = error ?? externalState?.error;
  const emit = (eventType: string, detail?: string) =>
    onFieldEvent?.(field.name, eventType, detail);

  const length = field.length ?? field.validation?.maxLength ?? 5;
  const keyUpHandler = field.onKeyUp
    ? fieldHandlers?.[field.onKeyUp]
    : undefined;
  const valueChangeHandler = field.onValueChange
    ? fieldHandlers?.[field.onValueChange]
    : undefined;

  if (externalState?.hidden) return null;

  return (
    <div ref={containerRef} className="grid gap-1.5">
      <FieldLabel field={field} translate={translate} />
      <Controller
        control={form.control}
        name={field.name}
        render={({ field: controllerField }) => (
          <OtpInput
            id={field.name}
            length={length}
            value={controllerField.value ?? ""}
            disabled={disabled}
            invalid={!!displayError}
            onChange={(val) => {
              emit("onChange", val);
              controllerField.onChange(val);
              if (valueChangeHandler && setFieldState) {
                valueChangeHandler(val, {
                  setFieldState,
                  getValues: () => form.getValues(),
                  apiFetcher,
                });
              }
            }}
            onComplete={(val) => {
              emit("onComplete", val);
              controllerField.onChange(val);
              if (keyUpHandler && setFieldState) {
                keyUpHandler(val, {
                  setFieldState,
                  getValues: () => form.getValues(),
                  apiFetcher,
                });
              }
              const formElement = containerRef.current?.closest("form");
              const submitButton =
                formElement?.querySelector<HTMLButtonElement>(
                  'button[type="submit"]',
                );
              if (submitButton) {
                submitButton.click();
              } else {
                formElement?.requestSubmit();
              }
            }}
          />
        )}
      />
      <FieldError id={errorId} message={displayError} translate={translate} />
    </div>
  );
}
