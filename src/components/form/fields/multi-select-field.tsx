import { Controller } from "react-hook-form";

import { MultiSelect } from "@/components/ui";
import { FieldError } from "./field-error";
import { FieldLabel, resolveText } from "./field-label";
import type { FieldComponentProps } from "./field-types";
import { useRemoteOptions } from "./use-remote-options";

export function MultiSelectField({
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

  const formattedOptions = options.map((option) => ({
    value: option.value,
    label: option.labelKey
      ? translate(option.labelKey)
      : (option.label ?? option.value),
  }));

  return (
    <div className="grid gap-1.5">
      <FieldLabel field={field} translate={translate} />
      <Controller
        control={form.control}
        name={field.name}
        render={({ field: controllerField }) => (
          <MultiSelect
            id={field.name}
            options={formattedOptions}
            value={
              Array.isArray(controllerField.value) ? controllerField.value : []
            }
            onValueChange={controllerField.onChange}
            placeholder={loading ? "..." : placeholder}
            searchable={field.searchable}
            disabled={field.disabled || loading}
            aria-describedby={error ? errorId : undefined}
            onBlur={controllerField.onBlur}
          />
        )}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}
