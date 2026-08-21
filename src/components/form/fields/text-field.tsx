import { Input } from "@/components/ui";
import { FieldError } from "./field-error";
import { FieldLabel, resolveText } from "./field-label";
import type { FieldComponentProps } from "./field-types";

// Maps a field's `type` to the native <input type>.
const INPUT_TYPE: Record<string, string> = {
  text: "text",
  email: "email",
  // sonarjs's hardcoded-password heuristic flags this key/value pair as if it were a credential -- it's a type-map entry, not a secret.
  // eslint-disable-next-line sonarjs/no-hardcoded-passwords
  password: "password",
  number: "number",
  date: "date",
};

export function TextField({
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
      <Input
        id={field.name}
        type={INPUT_TYPE[field.type] ?? "text"}
        placeholder={placeholder}
        disabled={field.disabled}
        invalid={!!error}
        blockE={field.blockE}
        aria-describedby={error ? errorId : undefined}
        {...form.register(field.name)}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}
