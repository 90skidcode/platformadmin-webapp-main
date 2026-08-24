import { Textarea } from "@/components/ui";
import { FieldError } from "./field-error";
import { FieldLabel, resolveText } from "./field-label";
import type { FieldComponentProps } from "./field-types";
import { useFieldEvents } from "./use-field-events";

export function TextareaField({
  field,
  form,
  translate,
  fieldEventHandlers,
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
  const { registerWithEvents } = useFieldEvents({
    field,
    form,
    fieldEventHandlers,
  });

  return (
    <div className="grid gap-1.5">
      <FieldLabel field={field} translate={translate} />
      <Textarea
        id={field.name}
        placeholder={placeholder}
        disabled={field.disabled}
        invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        {...registerWithEvents()}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}
