import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Label } from "./label";

describe("Label", () => {
  describe("associating with a field", () => {
    it("associates via htmlFor", () => {
      render(
        <>
          <Label htmlFor="email">Email</Label>
          <input id="email" />
        </>,
      );
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });
  });

  describe("the required indicator", () => {
    it("shows it when required is set", () => {
      render(<Label required>Email</Label>);
      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("omits it by default", () => {
      render(<Label>Email</Label>);
      expect(screen.queryByText("*")).not.toBeInTheDocument();
    });
  });
});
