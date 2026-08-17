import { describe, expect, it } from "vitest";

import { interpolateRow } from "./interpolate-row";

describe("interpolateRow", () => {
  describe("substituting placeholders present in the row", () => {
    it("substitutes a single placeholder", () => {
      expect(interpolateRow("/employees/{id}/edit", { id: "emp-1" })).toBe(
        "/employees/emp-1/edit",
      );
    });

    it("substitutes multiple placeholders", () => {
      expect(
        interpolateRow("/{entity}/{id}", { entity: "users", id: "u1" }),
      ).toBe("/users/u1");
    });

    it("coerces non-string row values to strings", () => {
      expect(interpolateRow("/rows/{id}", { id: 42 })).toBe("/rows/42");
    });
  });

  describe("when a placeholder has no matching row value", () => {
    it("leaves it untouched", () => {
      expect(interpolateRow("/employees/{missing}", { id: "emp-1" })).toBe(
        "/employees/{missing}",
      );
    });
  });
});
