"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { useApiFetcher, type ApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import { FormActions } from "../form-actions/form-actions";
import { schemaToZod } from "../schema-to-zod";
import type { ActionHandlers, FormSchema } from "../types";
import { ConditionalFormFieldItem } from "./conditional-form-field-item";
import { COLUMNS_CLASS, COL_SPAN_CLASS } from "./field-layout";
import { StaticFormFieldItem } from "./static-form-field-item";

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

  const zodSchema = useMemo(() => schemaToZod(schema.fields), [schema.fields]);

  const form = useForm({
    resolver: zodResolver(zodSchema),
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
        const isConditional = Boolean(field.showIf || field.disabledIf);

        if (isConditional) {
          return (
            <ConditionalFormFieldItem
              key={field.name}
              field={field}
              form={form}
              translate={translate}
              apiFetcher={fetcher}
              zodShape={zodSchema.shape}
              columns={columns}
            />
          );
        }

        return (
          <StaticFormFieldItem
            key={field.name}
            field={field}
            form={form}
            translate={translate}
            apiFetcher={fetcher}
            columns={columns}
          />
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
