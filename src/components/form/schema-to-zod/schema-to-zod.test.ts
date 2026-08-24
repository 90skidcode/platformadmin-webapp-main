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

  describe("when validating input against a pattern constraint", () => {
    const fields: FormField[] = [
      {
        name: "sku",
        type: "text",
        validation: { required: true, pattern: "^[A-Z]{3}-\\d{4}$" },
      },
    ];

    it("should reject input that does not match the pattern", () => {
      expect(schemaToZod(fields).safeParse({ sku: "abc-1234" }).success).toBe(
        false,
      );
    });

    it("should accept input that matches the pattern", () => {
      expect(schemaToZod(fields).safeParse({ sku: "ABC-1234" }).success).toBe(
        true,
      );
    });
  });

  describe("when validating a required multi-select field", () => {
    const fields: FormField[] = [
      { name: "roles", type: "multi-select", validation: { required: true } },
    ];

    it("should reject submission with no selected items", () => {
      const result = schemaToZod(fields).safeParse({ roles: [] });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Required");
      }
    });

    it("should accept submission when at least one item is selected", () => {
      expect(schemaToZod(fields).safeParse({ roles: ["admin"] }).success).toBe(
        true,
      );
    });
  });

  describe("when validating a multi-select field with minimum selection requirements", () => {
    it("should display the default minimum selection message when no custom message is set", () => {
      const fields: FormField[] = [
        {
          name: "roles",
          type: "multi-select",
          validation: { required: true, min: 2 },
        },
      ];
      const result = schemaToZod(fields).safeParse({ roles: ["admin"] });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Select at least 2 options",
        );
      }
    });

    it("should display the configured custom message when provided", () => {
      const fields: FormField[] = [
        {
          name: "roles",
          type: "multi-select",
          validation: {
            required: true,
            min: 2,
            messages: { min: "Select at least 2 roles" },
          },
        },
      ];
      const result = schemaToZod(fields).safeParse({ roles: ["admin"] });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Select at least 2 roles");
      }
    });
  });

  describe("when validating a multi-select field with maximum selection limits", () => {
    it("should display the default maximum selection message when no custom message is set", () => {
      const fields: FormField[] = [
        {
          name: "tags",
          type: "multi-select",
          validation: { max: 2 },
        },
      ];
      const result = schemaToZod(fields).safeParse({
        tags: ["tag1", "tag2", "tag3"],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Select at most 2 options",
        );
      }
    });

    it("should display the configured custom message when provided", () => {
      const fields: FormField[] = [
        {
          name: "tags",
          type: "multi-select",
          validation: {
            max: 2,
            messages: { max: "Maximum 2 tags allowed" },
          },
        },
      ];
      const result = schemaToZod(fields).safeParse({
        tags: ["tag1", "tag2", "tag3"],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Maximum 2 tags allowed");
      }
    });
  });

  describe("when validating an optional multi-select field", () => {
    const fields: FormField[] = [{ name: "tags", type: "multi-select" }];

    it("should allow submission without any selections", () => {
      expect(schemaToZod(fields).safeParse({ tags: [] }).success).toBe(true);
      expect(schemaToZod(fields).safeParse({}).success).toBe(true);
    });
  });

  describe("when validating a hidden field", () => {
    const fields: FormField[] = [{ name: "tenantId", type: "hidden" }];

    it("should preserve the given field value", () => {
      expect(schemaToZod(fields).safeParse({ tenantId: "acme" }).success).toBe(
        true,
      );
    });

    it("should allow omitting the hidden field value", () => {
      expect(schemaToZod(fields).safeParse({}).success).toBe(true);
    });
  });
});
