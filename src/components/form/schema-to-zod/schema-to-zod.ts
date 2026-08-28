import { z, type ZodTypeAny } from "zod";

import type { FieldValidation, FormField } from "../types";

/** Builds a `z.object()` shape from a schema's `fields[]` -- the only place
 * a field's `validation` turns into an actual runtime/type check. */
export function schemaToZod(fields: FormField[]) {
  const shape: Record<string, ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.name] = fieldToZodType(field);
  }
  return z.object(shape);
}

function fieldToZodType(field: FormField): ZodTypeAny {
  const v = field.validation ?? {};

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
      return applyStringValidation(z.string(), v, true);
    default:
      return applyStringValidation(z.string(), v);
  }
}

function applyStringValidation(
  base: z.ZodString,
  v: FieldValidation,
  isEmail = false,
): ZodTypeAny {
  let schema = base;

  // 1. If required, check min(1) FIRST so empty strings fail immediately
  // with the `required` message, before minLength/maxLength/pattern/email run.
  if (v.required) {
    schema = schema.min(1, v.messages?.required ?? "Required");
  }

  // 2. Format & length checks (only run on non-empty values)
  if (isEmail) {
    schema = schema.email(v.messages?.email);
  }
  if (v.minLength !== undefined)
    schema = schema.min(v.minLength, v.messages?.minLength);
  if (v.maxLength !== undefined)
    schema = schema.max(v.maxLength, v.messages?.maxLength);
  if (v.pattern)
    schema = schema.regex(new RegExp(v.pattern), v.messages?.pattern);

  // 3. If optional, allow omitted / empty string
  if (!v.required) {
    return schema.optional().or(z.literal(""));
  }

  return schema;
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
