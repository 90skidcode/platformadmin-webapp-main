import { describe, expect, it } from "vitest";

import type { FormField } from "../types";
import { schemaToZod } from "./schema-to-zod";

describe("schemaToZod", () => {
  it("rejects an empty value for a required text field", () => {
    const fields: FormField[] = [
      { name: "name", type: "text", validation: { required: true } },
    ];
    const result = schemaToZod(fields).safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts a non-empty value for a required text field", () => {
    const fields: FormField[] = [
      { name: "name", type: "text", validation: { required: true } },
    ];
    const result = schemaToZod(fields).safeParse({ name: "Kavya" });
    expect(result.success).toBe(true);
  });

  it("allows an optional text field to be omitted", () => {
    const fields: FormField[] = [{ name: "notes", type: "text" }];
    const result = schemaToZod(fields).safeParse({ notes: "" });
    expect(result.success).toBe(true);
  });

  it("enforces minLength/maxLength on a text field", () => {
    const fields: FormField[] = [
      {
        name: "code",
        type: "text",
        validation: { minLength: 3, maxLength: 5 },
      },
    ];
    expect(schemaToZod(fields).safeParse({ code: "ab" }).success).toBe(false);
    expect(schemaToZod(fields).safeParse({ code: "abcdef" }).success).toBe(
      false,
    );
    expect(schemaToZod(fields).safeParse({ code: "abcd" }).success).toBe(true);
  });

  it("validates email format", () => {
    const fields: FormField[] = [
      { name: "email", type: "email", validation: { required: true } },
    ];
    expect(
      schemaToZod(fields).safeParse({ email: "not-an-email" }).success,
    ).toBe(false);
    expect(
      schemaToZod(fields).safeParse({ email: "kavya@acme.example" }).success,
    ).toBe(true);
  });

  it("coerces and validates a number field's min/max", () => {
    const fields: FormField[] = [
      {
        name: "age",
        type: "number",
        validation: { required: true, min: 18, max: 65 },
      },
    ];
    const schema = schemaToZod(fields);
    expect(schema.safeParse({ age: "17" }).success).toBe(false);
    expect(schema.safeParse({ age: "30" }).success).toBe(true);
    expect(schema.safeParse({ age: 30 }).data).toEqual({ age: 30 });
  });

  it("requires a checkbox to be true when marked required", () => {
    const fields: FormField[] = [
      { name: "agree", type: "checkbox", validation: { required: true } },
    ];
    expect(schemaToZod(fields).safeParse({ agree: false }).success).toBe(false);
    expect(schemaToZod(fields).safeParse({ agree: true }).success).toBe(true);
  });

  it("allows an optional checkbox/switch to be false", () => {
    const fields: FormField[] = [{ name: "notify", type: "switch" }];
    expect(schemaToZod(fields).safeParse({ notify: false }).success).toBe(true);
  });

  it("enforces a regex pattern", () => {
    const fields: FormField[] = [
      {
        name: "sku",
        type: "text",
        validation: { required: true, pattern: "^[A-Z]{3}-\\d{4}$" },
      },
    ];
    expect(schemaToZod(fields).safeParse({ sku: "abc-1234" }).success).toBe(
      false,
    );
    expect(schemaToZod(fields).safeParse({ sku: "ABC-1234" }).success).toBe(
      true,
    );
  });

  it("passes hidden fields through untouched", () => {
    const fields: FormField[] = [{ name: "tenantId", type: "hidden" }];
    expect(schemaToZod(fields).safeParse({ tenantId: "acme" }).success).toBe(
      true,
    );
    expect(schemaToZod(fields).safeParse({}).success).toBe(true);
  });
});
