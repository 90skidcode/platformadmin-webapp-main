import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Label } from "./label";

describe("Label", () => {
  it("renders its text and associates with a field via htmlFor", () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" />
      </>,
    );
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("shows a required indicator when required is set", () => {
    render(<Label required>Email</Label>);
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("omits the required indicator by default", () => {
    render(<Label>Email</Label>);
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });
});
