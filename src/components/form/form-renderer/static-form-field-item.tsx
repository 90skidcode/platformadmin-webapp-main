import type { FieldValues, UseFormReturn } from "react-hook-form";

import type { ApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import { FIELD_REGISTRY } from "../field-registry";
import type { FormField } from "../types";

import { COL_SPAN_CLASS, type ColumnCount } from "./field-layout";

export interface StaticFormFieldItemProps {
  field: FormField;
  form: UseFormReturn<FieldValues>;
  translate: (key: string) => string;
  apiFetcher: ApiFetcher;
  columns: ColumnCount;
}

export function StaticFormFieldItem({
  field,
  form,
  translate,
  apiFetcher,
  columns,
}: Readonly<StaticFormFieldItemProps>) {
  const Field = FIELD_REGISTRY[field.type];
  const span = field.colSpan ?? (field.type === "textarea" ? columns : 1);

  return (
    <div className={COL_SPAN_CLASS[Math.min(span, columns) as ColumnCount]}>
      <Field
        field={field}
        form={form}
        translate={translate}
        apiFetcher={apiFetcher}
      />
    </div>
  );
}
