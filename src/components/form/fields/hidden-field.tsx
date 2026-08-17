import type { FieldComponentProps } from "./field-types";

export function HiddenField({ field, form }: Readonly<FieldComponentProps>) {
  return <input type="hidden" {...form.register(field.name)} />;
}
