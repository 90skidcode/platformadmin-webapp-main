import { Controller } from "react-hook-form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { FieldError } from "./field-error";
import { FieldLabel, resolveText } from "./field-label";
import type { FieldComponentProps } from "./field-types";
import { useRemoteOptions } from "./use-remote-options";

export function SelectField({
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
  const { options, loading } = useRemoteOptions(
    field.optionsSource,
    apiFetcher,
  );
  const emit = (eventType: string, detail?: string) =>
    onFieldEvent?.(field.name, eventType, detail);

  // Same standard as TextField's onKeyUp: field.onValueChange resolves
  // against fieldHandlers, and any *other* field's handler may have called
  // ctx.setFieldState(this field's name, ...) -- merge that in alongside
  // this field's own local disabled/error.
  const disabled = field.disabled || loading || !!externalState?.disabled;
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
          <Select
            value={controllerField.value ?? ""}
            onValueChange={(value) => {
              emit("onValueChange", value);
              controllerField.onChange(value);
              if (valueChangeHandler && setFieldState) {
                valueChangeHandler(value, {
                  setFieldState,
                  getValues: () => form.getValues(),
                  apiFetcher,
                });
              }
            }}
            disabled={disabled}
          >
            {/* Same standard as the other fields -- SelectTrigger renders
                the <button role="combobox"> a user actually interacts with
                (see ui/select.tsx). onClick/onKeyDown are composed with its
                own open/close logic; the rest spread straight onto the
                button. Options inside the listbox aren't individually
                wired, same as a native <select>'s <option>s wouldn't be. */}
            <SelectTrigger
              id={field.name}
              aria-describedby={displayError ? errorId : undefined}
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
            >
              <SelectValue placeholder={loading ? "..." : placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.labelKey
                    ? translate(option.labelKey)
                    : (option.label ?? option.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError id={errorId} message={displayError} />
    </div>
  );
}
