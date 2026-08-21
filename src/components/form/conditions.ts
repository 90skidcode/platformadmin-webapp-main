import type { FieldErrors, FieldValues } from "react-hook-form";
import type { ZodTypeAny } from "zod";

import type { FieldCondition, FormField } from "./types";

export interface ConditionEvaluationContext {
  formValues: FieldValues;
  formErrors: FieldErrors;
  zodShape: Record<string, ZodTypeAny>;
}

export interface FieldConditionContext {
  fieldName: string;
  fieldValue: unknown;
  hasFormError: boolean;
  isValid: boolean;
}

type ConditionEvaluator = (context: FieldConditionContext) => boolean;

const CONDITION_EVALUATORS: Record<
  FieldCondition["condition"],
  ConditionEvaluator
> = {
  valid: ({ isValid }) => isValid,
  invalid: ({ isValid }) => !isValid,
};

export function isFieldValid(
  fieldName: string,
  formValues: FieldValues,
  formErrors: FieldErrors,
  zodShape: Record<string, ZodTypeAny>,
): boolean {
  const fieldValue = formValues[fieldName];
  const fieldValidator = zodShape[fieldName];

  const isSchemaValid = fieldValidator
    ? fieldValidator.safeParse(fieldValue).success
    : true;

  const hasFormError = Boolean(formErrors[fieldName]);

  return !hasFormError && isSchemaValid;
}

export function evaluateCondition(
  condition: FieldCondition,
  context: ConditionEvaluationContext,
): boolean {
  const { formValues, formErrors, zodShape } = context;
  const fieldName = condition.field;
  const fieldValue = formValues[fieldName];
  const hasFormError = Boolean(formErrors[fieldName]);
  const isValid = isFieldValid(fieldName, formValues, formErrors, zodShape);

  const evaluator = CONDITION_EVALUATORS[condition.condition];
  if (!evaluator) {
    return false;
  }

  return evaluator({
    fieldName,
    fieldValue,
    hasFormError,
    isValid,
  });
}

export function isFieldVisible(
  field: FormField,
  context: ConditionEvaluationContext,
): boolean {
  if (!field.showIf) {
    return true;
  }
  return evaluateCondition(field.showIf, context);
}

export function isFieldDisabled(
  field: FormField,
  context: ConditionEvaluationContext,
): boolean {
  if (field.disabled) {
    return true;
  }
  if (!field.disabledIf) {
    return false;
  }
  return evaluateCondition(field.disabledIf, context);
}
