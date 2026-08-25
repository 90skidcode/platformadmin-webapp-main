"use client";

import { useCallback, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { useApiFetcher, type ApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import { FIELD_REGISTRY } from "../field-registry";
import { FormActions } from "../form-actions/form-actions";
import { schemaToZod } from "../schema-to-zod";
import type {
  ActionHandlers,
  FieldHandlers,
  FieldState,
  FormSchema,
} from "../types";

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
  /** Optional sink for every field's raw DOM events -- see FieldComponentProps. */
  onFieldEvent?: (
    fieldName: string,
    eventType: string,
    detail?: string,
  ) => void;
  /** Registry any field's `onKeyUp` (etc.) resolves against -- see FieldHandlers. */
  fieldHandlers?: FieldHandlers;
}

/** The JSON-driven form engine (plan §7.1/§9): `schema` in, a validated,
 * submittable form out -- nothing about the concrete form is hand-written. */
export function FormRenderer({
  schema,
  actionHandlers = {},
  apiFetcher,
  defaultValues,
  onRefetch,
  onFieldEvent,
  fieldHandlers,
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

  // Where a handler's `ctx.setFieldState` writes its disabled/error/hidden
  // -- keyed by the *target* field's name, not the field whose handler ran.
  // Lives here (not on the target field itself) because more than one
  // handler could target the same field, and a field doesn't own state
  // some other field's handler wrote into it. `value`/`focus` are *not*
  // stored here -- see setFieldState below, and FieldState's own doc comment.
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>(
    {},
  );
  const setFieldState = useCallback(
    (fieldName: string, state: FieldState) => {
      const { value, focus, ...visualState } = state;
      // `value`: react-hook-form is already the source of truth for values
      // -- setValue *is* the field update, not a second copy of it.
      if (value !== undefined) {
        form.setValue(fieldName, value, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });
      }
      // `focus`: one-shot, so it's applied now and never stored.
      if (focus) form.setFocus(fieldName);
      // disabled/error/hidden: merged, not replaced, so e.g. a later call
      // that only touches `error` doesn't accidentally clear `disabled`.
      // (To actually clear one, pass it explicitly as `undefined`/`false`.)
      if (Object.keys(visualState).length > 0) {
        setFieldStates((prev) => ({
          ...prev,
          [fieldName]: { ...prev[fieldName], ...visualState },
        }));
      }
    },
    [form],
  );

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
              onFieldEvent={onFieldEvent}
              fieldHandlers={fieldHandlers}
              externalState={fieldStates[field.name]}
              setFieldState={setFieldState}
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
