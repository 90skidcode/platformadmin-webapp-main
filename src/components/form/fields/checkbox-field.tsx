import { Controller } from "react-hook-form";

import { Checkbox, Label } from "@/components/ui";
import { FieldError } from "./field-error";
import { resolveText } from "./field-label";
import type { FieldComponentProps } from "./field-types";

export function CheckboxField({
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
  const label = resolveText(translate, field.label, field.labelKey);
  const errorId = `${field.name}-error`;
  const emit = (eventType: string, detail?: string) =>
    onFieldEvent?.(field.name, eventType, detail);

  // Same standard as TextField: field.onCheckedChange resolves against
  // fieldHandlers, and any *other* field's handler may have called
  // ctx.setFieldState(this field's name, ...) -- merge that in alongside
  // this field's own local disabled/error.
  const disabled = field.disabled || !!externalState?.disabled;
  const displayError = error ?? externalState?.error;
  const checkedChangeHandler = field.onCheckedChange
    ? fieldHandlers?.[field.onCheckedChange]
    : undefined;

  if (externalState?.hidden) return null;

  return (
    <div className="grid gap-1.5">
      <Controller
        control={form.control}
        name={field.name}
        render={({ field: controllerField }) => (
          <div className="flex items-center gap-2">
            <Checkbox
              id={field.name}
              checked={!!controllerField.value}
              onCheckedChange={(checked) => {
                emit("onCheckedChange", String(checked));
                controllerField.onChange(checked);
                if (checkedChangeHandler && setFieldState) {
                  checkedChangeHandler(String(checked), {
                    setFieldState,
                    getValues: () => form.getValues(),
                    apiFetcher,
                  });
                }
              }}
              disabled={disabled}
              aria-describedby={displayError ? errorId : undefined}
              // Same standard as TextField's event wiring, adapted to what
              // this control actually is: ui/checkbox.tsx renders a
              // <button role="checkbox">, not a native <input> -- there's no
              // onChange DOM event (onCheckedChange above is its equivalent)
              // and no text content, so paste/copy/cut/select don't apply.
              // This is every event a button-based control can fire.
              onClick={() => emit("onClick")}
              onDoubleClick={() => emit("onDoubleClick")}
              onMouseDown={() => emit("onMouseDown")}
              onMouseUp={() => emit("onMouseUp")}
              onMouseEnter={() => emit("onMouseEnter")}
              onMouseLeave={() => emit("onMouseLeave")}
              onFocus={() => emit("onFocus")}
              onBlur={() => {
                emit("onBlur");
                controllerField.onBlur();
              }}
              onKeyDown={(e) => emit("onKeyDown", e.key)}
              onKeyUp={(e) => emit("onKeyUp", e.key)}
              onContextMenu={() => emit("onContextMenu")}
            />
            {label && (
              <Label htmlFor={field.name} required={field.validation?.required}>
                {label}
              </Label>
            )}
          </div>
        )}
      />
      <FieldError id={errorId} message={displayError} translate={translate} />
    </div>
  );
}
