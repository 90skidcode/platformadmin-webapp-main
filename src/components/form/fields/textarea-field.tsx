import { Textarea } from "@/components/ui";
import { FieldError } from "./field-error";
import { FieldLabel, resolveText } from "./field-label";
import type { FieldComponentProps } from "./field-types";

export function TextareaField({
  field,
  form,
  translate,
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

  return (
    <div className="grid gap-1.5">
      <FieldLabel field={field} translate={translate} />
      <Textarea
        id={field.name}
        placeholder={placeholder}
        disabled={field.disabled}
        invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        {...form.register(field.name)}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}
