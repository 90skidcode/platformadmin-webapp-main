import type { FieldComponentProps } from "./field-types";
import { useFieldEvents } from "./use-field-events";

export function HiddenField({
  field,
  form,
  fieldEventHandlers,
}: Readonly<FieldComponentProps>) {
  const { registerWithEvents } = useFieldEvents({
    field,
    form,
    fieldEventHandlers,
  });
  return <input type="hidden" {...registerWithEvents()} />;
}
