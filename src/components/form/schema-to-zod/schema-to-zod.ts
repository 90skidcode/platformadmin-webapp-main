import { z, type ZodTypeAny } from "zod";

import type { FieldValidation, FormField } from "../types";

/** Builds a `z.object()` shape from a schema's `fields[]` -- the only place
 * a field's `validation` turns into an actual runtime/type check.
 * Supports conditional validation: dependent fields are validated only when parent is active. */
export function schemaToZod(fields: FormField[]) {
  const shape: Record<string, ZodTypeAny> = {};
  for (const field of fields) {
    const isDependent = Boolean(field.dependsOn);
    shape[field.name] = fieldToZodType(field, isDependent);
  }

  const baseObject = z.object(shape);

  const dependentRequiredFields = fields.filter(
    (f) => f.dependsOn && f.validation?.required,
  );

  if (dependentRequiredFields.length === 0) {
    return baseObject;
  }

  return baseObject.superRefine((data, ctx) => {
    for (const field of dependentRequiredFields) {
      const parentName = field.dependsOn as string;
      const parentVal = (data as Record<string, unknown>)[parentName];
      const isParentActive = Boolean(parentVal);

      if (isParentActive) {
        const val = (data as Record<string, unknown>)[field.name];
        if (val === undefined || val === null || val === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: field.validation?.messages?.required ?? "Required",
            path: [field.name],
          });
        }
      }
    }
  });
}

function fieldToZodType(field: FormField, isDependent = false): ZodTypeAny {
  const v = { ...field.validation };
  if (isDependent && v.required) {
    // If field is dependent, its requirement is evaluated dynamically in superRefine
    v.required = false;
  }

  switch (field.type) {
    case "number":
      return applyNumberValidation(
        z.coerce.number({ error: v.messages?.required }),
        v,
      );
    case "checkbox":
    case "switch":
      return v.required
        ? z.literal(true, { error: v.messages?.required ?? "Required" })
        : z.boolean();
    case "hidden":
      return z.any().optional();
    case "email":
      return applyStringValidation(
        z
          .string(v.required ? { error: v.messages?.required } : undefined)
          .email(v.messages?.email),
        v,
      );
    default:
      return applyStringValidation(z.string(), v);
  }
}

function applyStringValidation(
  base: z.ZodString,
  v: FieldValidation,
): ZodTypeAny {
  let schema = base;
  if (v.minLength !== undefined)
    schema = schema.min(v.minLength, v.messages?.minLength);
  if (v.maxLength !== undefined)
    schema = schema.max(v.maxLength, v.messages?.maxLength);
  if (v.pattern)
    schema = schema.regex(new RegExp(v.pattern), v.messages?.pattern);

  if (v.required) {
    return schema.min(1, v.messages?.required ?? "Required");
  }
  return schema.optional().or(z.literal(""));
}

function applyNumberValidation(
  base: z.ZodNumber,
  v: FieldValidation,
): ZodTypeAny {
  let schema = base;
  if (v.min !== undefined) schema = schema.min(v.min, v.messages?.min);
  if (v.max !== undefined) schema = schema.max(v.max, v.messages?.max);
  return v.required ? schema : schema.optional();
}
