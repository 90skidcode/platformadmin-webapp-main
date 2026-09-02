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

  describe("password field validation — what the user sees when they submit", () => {
    const passwordField: FormField[] = [
      {
        name: "password",
        type: "password",
        validation: {
          required: true,
          minLength: 8,
          maxLength: 13,
          pattern: "^(?=.*[a-z])(?=.*[A-Z]).{8,13}$",
          messages: {
            required: "passwordRequired",
            minLength: "passwordComplexity",
            maxLength: "passwordComplexity",
            pattern: "passwordComplexity",
          },
        },
      },
    ];

    it("tells the user the password field cannot be left blank, before any other rule is checked", () => {
      // When the user submits without entering a password, they should see
      // "Password is required" — not a complexity hint like "8–13 characters".
      const result = schemaToZod(passwordField).safeParse({ password: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("passwordRequired");
      }
    });

    it("tells the user the password is too short when they have typed something but not enough characters", () => {
      // A partially entered password like "Ab" should get a complexity hint,
      // not a "required" message — the user did try to enter something.
      // eslint-disable-next-line sonarjs/no-hardcoded-passwords
      const result = schemaToZod(passwordField).safeParse({ password: "Ab" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("passwordComplexity");
      }
    });

    it("tells the user the password does not meet the complexity rules when it has enough length but wrong format", () => {
      // e.g. "lowercaseonly" is long enough but missing an uppercase letter,
      // so the user should see the complexity hint.
      const result = schemaToZod(passwordField).safeParse({
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- test input
        password: "lowercaseonly",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("passwordComplexity");
      }
    });

    it("tells the user the email field cannot be left blank, before checking whether it is a valid email address", () => {
      // When the user submits with an empty email, they should see
      // "Email is required" — not "Invalid email format".
      const emailFields: FormField[] = [
        {
          name: "email",
          type: "email",
          validation: {
            required: true,
            messages: { required: "emailRequired", email: "emailInvalid" },
          },
        },
      ];
      const result = schemaToZod(emailFields).safeParse({ email: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("emailRequired");
      }
    });
  });

  describe("an otp field", () => {
    const otpFields: FormField[] = [
      {
        name: "otp",
        type: "otp",
        validation: {
          required: true,
          minLength: 5,
          maxLength: 5,
          pattern: "^[0-9]{5}$",
        },
      },
    ];

    it("rejects an empty otp value", () => {
      expect(schemaToZod(otpFields).safeParse({ otp: "" }).success).toBe(false);
    });

    it("rejects an otp shorter than 5 digits", () => {
      expect(schemaToZod(otpFields).safeParse({ otp: "123" }).success).toBe(
        false,
      );
    });

    it("accepts a valid 5-digit otp", () => {
      expect(schemaToZod(otpFields).safeParse({ otp: "12345" }).success).toBe(
        true,
      );
    });
  });
});
