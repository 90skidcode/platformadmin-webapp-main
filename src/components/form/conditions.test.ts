import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  evaluateCondition,
  isFieldDisabled,
  isFieldValid,
  isFieldVisible,
} from "./conditions";
import type { FormField } from "./types";

describe("conditions", () => {
  const zodShape = {
    name: z.string().min(1, "Required"),
    code: z
      .string()
      .min(3, "Min 3")
      .regex(/^[A-Z]+$/, "Uppercase only"),
    optionalField: z.string().optional().or(z.literal("")),
  };

  describe("isFieldValid", () => {
    it("returns false when a required field is empty", () => {
      const isValid = isFieldValid("name", { name: "" }, {}, zodShape);
      expect(isValid).toBe(false);
    });

    it("returns true when a field has a valid value", () => {
      const isValid = isFieldValid("name", { name: "Priya" }, {}, zodShape);
      expect(isValid).toBe(true);
    });

    it("returns false when a value does not meet the validation rules", () => {
      expect(isFieldValid("code", { code: "AB" }, {}, zodShape)).toBe(false);
      expect(isFieldValid("code", { code: "abc" }, {}, zodShape)).toBe(false);
      expect(isFieldValid("code", { code: "ABC" }, {}, zodShape)).toBe(true);
    });

    it("returns false when the field has an existing error", () => {
      const isValid = isFieldValid(
        "name",
        { name: "Priya" },
        { name: { type: "server", message: "Name already exists" } },
        zodShape,
      );
      expect(isValid).toBe(false);
    });

    it("returns true for optional or unregistered fields without errors", () => {
      expect(
        isFieldValid("optionalField", { optionalField: "" }, {}, zodShape),
      ).toBe(true);
      expect(isFieldValid("unregistered", {}, {}, zodShape)).toBe(true);
    });
  });

  describe("evaluateCondition", () => {
    it("returns true when the field is valid and false when it is invalid", () => {
      expect(
        evaluateCondition(
          { field: "name", condition: "valid" },
          { formValues: { name: "" }, formErrors: {}, zodShape },
        ),
      ).toBe(false);

      expect(
        evaluateCondition(
          { field: "name", condition: "valid" },
          { formValues: { name: "Priya" }, formErrors: {}, zodShape },
        ),
      ).toBe(true);
    });

    it("returns true when the field is invalid and false when it is valid", () => {
      expect(
        evaluateCondition(
          { field: "name", condition: "invalid" },
          { formValues: { name: "" }, formErrors: {}, zodShape },
        ),
      ).toBe(true);

      expect(
        evaluateCondition(
          { field: "name", condition: "invalid" },
          { formValues: { name: "Priya" }, formErrors: {}, zodShape },
        ),
      ).toBe(false);
    });
  });

  describe("isFieldVisible", () => {
    it("keeps the field visible when no visibility rule is defined", () => {
      const field: FormField = { name: "surname", type: "text" };
      expect(
        isFieldVisible(field, {
          formValues: {},
          formErrors: {},
          zodShape,
        }),
      ).toBe(true);
    });

    it("shows the field when the condition is met and hides it otherwise", () => {
      const field: FormField = {
        name: "surname",
        type: "text",
        showIf: { field: "name", condition: "valid" },
      };

      expect(
        isFieldVisible(field, {
          formValues: { name: "" },
          formErrors: {},
          zodShape,
        }),
      ).toBe(false);

      expect(
        isFieldVisible(field, {
          formValues: { name: "Priya" },
          formErrors: {},
          zodShape,
        }),
      ).toBe(true);
    });
  });

  describe("isFieldDisabled", () => {
    it("keeps the field disabled when it is explicitly disabled", () => {
      const field: FormField = {
        name: "surname",
        type: "text",
        disabled: true,
        disabledIf: { field: "name", condition: "valid" },
      };
      expect(
        isFieldDisabled(field, {
          formValues: { name: "" },
          formErrors: {},
          zodShape,
        }),
      ).toBe(true);
    });

    it("keeps the field enabled when no disabled rule is defined", () => {
      const field: FormField = { name: "surname", type: "text" };
      expect(
        isFieldDisabled(field, {
          formValues: {},
          formErrors: {},
          zodShape,
        }),
      ).toBe(false);
    });

    it("disables the field when the condition is met and enables it otherwise", () => {
      const field: FormField = {
        name: "surname",
        type: "text",
        disabledIf: { field: "name", condition: "invalid" },
      };

      expect(
        isFieldDisabled(field, {
          formValues: { name: "" },
          formErrors: {},
          zodShape,
        }),
      ).toBe(true);

      expect(
        isFieldDisabled(field, {
          formValues: { name: "Priya" },
          formErrors: {},
          zodShape,
        }),
      ).toBe(false);
    });
  });
});
