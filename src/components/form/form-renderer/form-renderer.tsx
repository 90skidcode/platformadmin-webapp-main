"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { useApiFetcher, type ApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import { FIELD_REGISTRY } from "../field-registry";
import { FormActions } from "../form-actions/form-actions";
import { schemaToZod } from "../schema-to-zod";
import type { ActionHandlers, FormSchema } from "../types";

type ColumnCount = 1 | 2 | 3;

const COLUMNS_CLASS: Record<ColumnCount, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
};

const COL_SPAN_CLASS: Record<ColumnCount, string> = {
  1: "",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
};

export interface FormRendererProps {
  schema: FormSchema;
  actionHandlers?: ActionHandlers;
  /** Defaults to `useApiFetcher()` -- tests inject a mock without touching context providers (plan §6.3). */
  apiFetcher?: ApiFetcher;
  defaultValues?: Record<string, unknown>;
  /** Backs `onSuccess.refetch`/`onError.refetch` -- e.g. this form lives in a
   * dialog next to a table it should refresh once submitted. */
  onRefetch?: () => void;
}

/** The JSON-driven form engine (plan §7.1/§9): `schema` in, a validated,
 * submittable form out -- nothing about the concrete form is hand-written. */
export function FormRenderer({
  schema,
  actionHandlers = {},
  apiFetcher,
  defaultValues,
  onRefetch,
}: Readonly<FormRendererProps>) {
  const fallbackFetcher = useApiFetcher();
  const fetcher = apiFetcher ?? fallbackFetcher;
  const translate = useTranslations(schema.i18nNamespace);

  const schemaDefaults = Object.fromEntries(
    schema.fields.map((field) => [field.name, field.defaultValue ?? ""]),
  );

  const form = useForm({
    resolver: zodResolver(schemaToZod(schema.fields)),
    defaultValues: { ...schemaDefaults, ...defaultValues },
  });

  const columns = schema.layout?.columns ?? 1;

  return (
    <form
      noValidate
      onSubmit={(e) => e.preventDefault()}
      className={`grid gap-4 ${COLUMNS_CLASS[columns]}`}
    >
      {schema.fields.map((field) => {
        const Field = FIELD_REGISTRY[field.type];
        const span = field.colSpan ?? (field.type === "textarea" ? columns : 1);
        return (
          <div
            key={field.name}
            className={COL_SPAN_CLASS[Math.min(span, columns) as ColumnCount]}
          >
            <Field
              field={field}
              form={form}
              translate={translate}
              apiFetcher={fetcher}
              actionHandlers={actionHandlers}
            />
          </div>
        );
      })}
      <div className={COL_SPAN_CLASS[columns]}>
        <FormActions
          schema={schema}
          form={form}
          actionHandlers={actionHandlers}
          apiFetcher={fetcher}
          translate={translate}
          onRefetch={onRefetch}
        />
      </div>
    </form>
  );
}
