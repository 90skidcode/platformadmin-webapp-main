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
  const helpText = resolveText(translate, field.helpText, field.helpTextKey);
  const errorId = `${field.name}-error`;

  return (
    <div className="grid gap-1.5">
      <Controller
        control={form.control}
        name={field.name}
        render={({ field: controllerField }) => (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-input bg-card p-3 shadow-xs">
            <div className="space-y-0.5 pr-2">
              {label && (
                <Label
                  htmlFor={field.name}
                  className="cursor-pointer font-medium text-foreground"
                >
                  {label}
                </Label>
              )}
              {helpText && (
                <p className="text-xs text-muted-foreground">{helpText}</p>
              )}
            </div>
            <Switch
              id={field.name}
              checked={!!controllerField.value}
              onCheckedChange={controllerField.onChange}
              disabled={field.disabled}
              aria-describedby={error ? errorId : undefined}
            />
          </div>
        )}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}
