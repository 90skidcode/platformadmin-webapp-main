import { describe, expect, it } from "vitest";

import type { FormField } from "../types";
import { schemaToZod } from "./schema-to-zod";

describe("schemaToZod", () => {
  describe("a required text field", () => {
    const fields: FormField[] = [
      { name: "name", type: "text", validation: { required: true } },
    ];

    it("rejects an empty value", () => {
      expect(schemaToZod(fields).safeParse({ name: "" }).success).toBe(false);
    });

    it("accepts a non-empty value", () => {
      expect(schemaToZod(fields).safeParse({ name: "Kavya" }).success).toBe(
        true,
      );
    });
  });

  describe("an optional text field", () => {
    it("can be omitted", () => {
      const fields: FormField[] = [{ name: "notes", type: "text" }];
      expect(schemaToZod(fields).safeParse({ notes: "" }).success).toBe(true);
    });
  });

  describe("a text field with minLength/maxLength", () => {
    const fields: FormField[] = [
      {
        name: "code",
        type: "text",
        validation: { minLength: 3, maxLength: 5 },
      },
    ];

    it("rejects a value shorter than minLength", () => {
      expect(schemaToZod(fields).safeParse({ code: "ab" }).success).toBe(false);
    });

    it("rejects a value longer than maxLength", () => {
      expect(schemaToZod(fields).safeParse({ code: "abcdef" }).success).toBe(
        false,
      );
    });

    it("accepts a value within range", () => {
      expect(schemaToZod(fields).safeParse({ code: "abcd" }).success).toBe(
        true,
      );
    });
  });

  describe("an email field", () => {
    const fields: FormField[] = [
      { name: "email", type: "email", validation: { required: true } },
    ];

    it("rejects a malformed address", () => {
      expect(
        schemaToZod(fields).safeParse({ email: "not-an-email" }).success,
      ).toBe(false);
    });

    it("accepts a well-formed address", () => {
      expect(
        schemaToZod(fields).safeParse({ email: "kavya@acme.example" }).success,
      ).toBe(true);
    });
  });

  describe("a number field with min/max", () => {
    const fields: FormField[] = [
      {
        name: "age",
        type: "number",
        validation: { required: true, min: 18, max: 65 },
      },
    ];

    it("rejects a value below min", () => {
      expect(schemaToZod(fields).safeParse({ age: "17" }).success).toBe(false);
    });

    it("accepts a value within range", () => {
      expect(schemaToZod(fields).safeParse({ age: "30" }).success).toBe(true);
    });

    it("coerces a numeric string to a number", () => {
      expect(schemaToZod(fields).safeParse({ age: 30 }).data).toEqual({
        age: 30,
      });
    });
  });

  describe("a required checkbox", () => {
    const fields: FormField[] = [
      { name: "agree", type: "checkbox", validation: { required: true } },
    ];

    it("rejects false", () => {
      expect(schemaToZod(fields).safeParse({ agree: false }).success).toBe(
        false,
      );
    });

    it("accepts true", () => {
      expect(schemaToZod(fields).safeParse({ agree: true }).success).toBe(true);
    });
  });

  describe("an optional checkbox/switch", () => {
    it("allows false", () => {
      const fields: FormField[] = [{ name: "notify", type: "switch" }];
      expect(schemaToZod(fields).safeParse({ notify: false }).success).toBe(
        true,
      );
    });
  });

  describe("a field with a regex pattern", () => {
    const fields: FormField[] = [
      {
        name: "sku",
        type: "text",
        validation: { required: true, pattern: "^[A-Z]{3}-\\d{4}$" },
      },
    ];

    it("rejects a value that doesn't match the pattern", () => {
      expect(schemaToZod(fields).safeParse({ sku: "abc-1234" }).success).toBe(
        false,
      );
    });

    it("accepts a value that matches the pattern", () => {
      expect(schemaToZod(fields).safeParse({ sku: "ABC-1234" }).success).toBe(
        true,
      );
    });
  });

  describe("a hidden field", () => {
    const fields: FormField[] = [{ name: "tenantId", type: "hidden" }];

    it("passes a given value through untouched", () => {
      expect(schemaToZod(fields).safeParse({ tenantId: "acme" }).success).toBe(
        true,
      );
    });

    it("doesn't require a value at all", () => {
      expect(schemaToZod(fields).safeParse({}).success).toBe(true);
    });
  });

  describe("a dependent field with conditional validation", () => {
    const fields: FormField[] = [
      { name: "enableDelivery", type: "switch" },
      {
        name: "deliverySlot",
        type: "select",
        dependsOn: "enableDelivery",
        validation: { required: true, messages: { required: "Slot required" } },
      },
    ];

    it("allows empty value when parent switch is false", () => {
      expect(
        schemaToZod(fields).safeParse({
          enableDelivery: false,
          deliverySlot: "",
        }).success,
      ).toBe(true);
    });

    it("rejects empty value when parent switch is true", () => {
      const result = schemaToZod(fields).safeParse({
        enableDelivery: true,
        deliverySlot: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Slot required");
        expect(result.error.issues[0].path).toEqual(["deliverySlot"]);
      }
    });

    it("accepts valid value when parent switch is true", () => {
      expect(
        schemaToZod(fields).safeParse({
          enableDelivery: true,
          deliverySlot: "morning",
        }).success,
      ).toBe(true);
    });
  });
});
