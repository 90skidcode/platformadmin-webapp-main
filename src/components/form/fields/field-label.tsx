import { Label } from "@/components/ui";
import type { FormField } from "../types";

export function resolveText(
  translate: (key: string) => string,
  explicit: string | undefined,
  key: string | undefined,
): string | undefined {
  if (key) {
    try {
      return translate(key);
    } catch {
      return explicit ?? key;
    }
  }
  return explicit;
}

export function FieldLabel({
  field,
  translate,
}: {
  field: FormField;
  translate: (key: string) => string;
}) {
  const label = resolveText(translate, field.label, field.labelKey);
  if (!label) return null;
  return (
    <Label htmlFor={field.name} required={field.validation?.required}>
      {label}
    </Label>
  );
}
