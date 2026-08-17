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

  return (
    <div className="grid gap-1.5">
      <FieldLabel field={field} translate={translate} />
      <Controller
        control={form.control}
        name={field.name}
        render={({ field: controllerField }) => (
          <Select
            value={controllerField.value ?? ""}
            onValueChange={controllerField.onChange}
            disabled={field.disabled || loading}
          >
            <SelectTrigger
              id={field.name}
              aria-describedby={error ? errorId : undefined}
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
      <FieldError id={errorId} message={error} />
    </div>
  );
}
