import type { FieldComponentProps } from "./field-types";

// No onFieldEvent wiring, unlike every other field here -- a hidden input
// is never rendered, focusable, or clickable, so none of the events the
// other fields log can ever fire on it. Wiring handlers that can never run
// would just be dead code pretending otherwise.
export function HiddenField({ field, form }: Readonly<FieldComponentProps>) {
  return <input type="hidden" {...form.register(field.name)} />;
}
