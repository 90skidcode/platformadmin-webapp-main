import { Controller } from "react-hook-form";

import { Label, Switch } from "@/components/ui";
import { FieldError } from "./field-error";
import { resolveText } from "./field-label";
import type { FieldComponentProps } from "./field-types";

export function SwitchField({
  field,
  form,
  translate,
}: Readonly<FieldComponentProps>) {
  const error = form.formState.errors[field.name]?.message as
    | string
    | undefined;
  const label = resolveText(translate, field.label, field.labelKey);
  const errorId = `${field.name}-error`;

  return (
    <div className="grid gap-1.5">
      <Controller
        control={form.control}
        name={field.name}
        render={({ field: controllerField }) => (
          <div className="flex items-center gap-2">
            <Switch
              id={field.name}
              checked={!!controllerField.value}
              onCheckedChange={controllerField.onChange}
              disabled={field.disabled}
              aria-describedby={error ? errorId : undefined}
            />
            {label && <Label htmlFor={field.name}>{label}</Label>}
          </div>
        )}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}
