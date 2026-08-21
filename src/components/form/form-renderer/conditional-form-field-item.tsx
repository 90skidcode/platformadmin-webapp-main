"use client";

import { useEffect, useMemo } from "react";
import {
  useFormState,
  useWatch,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import type { ZodTypeAny } from "zod";

import type { ApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import {
  isFieldDisabled,
  isFieldVisible,
  type ConditionEvaluationContext,
} from "../conditions";
import { FIELD_REGISTRY } from "../field-registry";
import { COL_SPAN_CLASS, type ColumnCount } from "./field-layout";
import { FormField } from "../types";

export interface ConditionalFormFieldItemProps {
  field: FormField;
  form: UseFormReturn<FieldValues>;
  translate: (key: string) => string;
  apiFetcher: ApiFetcher;
  zodShape: Record<string, ZodTypeAny>;
  columns: ColumnCount;
}

export function ConditionalFormFieldItem({
  field,
  form,
  translate,
  apiFetcher,
  zodShape,
  columns,
}: Readonly<ConditionalFormFieldItemProps>) {
  const dependentFields = useMemo(
    () =>
      Array.from(
        new Set(
          [field.showIf?.field, field.disabledIf?.field].filter(
            (name): name is string => Boolean(name),
          ),
        ),
      ),
    [field.showIf?.field, field.disabledIf?.field],
  );

  const watchedValues = useWatch({
    control: form.control,
    name: dependentFields,
  });

  const { errors: formErrors } = useFormState({
    control: form.control,
    name: dependentFields,
  });

  const formValues = Object.fromEntries(
    dependentFields.map((name, index) => [
      name,
      watchedValues[index] !== undefined
        ? watchedValues[index]
        : form.getValues(name),
    ]),
  );

  const conditionContext: ConditionEvaluationContext = {
    formValues,
    formErrors,
    zodShape,
  };

  const isVisible = isFieldVisible(field, conditionContext);

  useEffect(() => {
    if (!isVisible) {
      form.clearErrors(field.name);
    }
  }, [isVisible, field.name, form]);

  if (!isVisible) {
    return null;
  }

  const Field = FIELD_REGISTRY[field.type];
  const span = field.colSpan ?? (field.type === "textarea" ? columns : 1);
  const isDisabled = isFieldDisabled(field, conditionContext);
  const effectiveField =
    isDisabled !== field.disabled ? { ...field, disabled: isDisabled } : field;

  return (
    <div className={COL_SPAN_CLASS[Math.min(span, columns) as ColumnCount]}>
      <Field
        field={effectiveField}
        form={form}
        translate={translate}
        apiFetcher={apiFetcher}
      />
    </div>
  );
}
