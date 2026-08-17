import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Badge } from "./badge";

describe("Badge", () => {
  it("renders its label", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies the default variant classes", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toHaveClass("bg-primary");
  });

  it("applies a destructive variant when requested", () => {
    render(<Badge variant="destructive">Deactivated</Badge>);
    expect(screen.getByText("Deactivated")).toHaveClass("bg-destructive");
  });

  it("merges a custom className", () => {
    render(<Badge className="ml-2">Active</Badge>);
    expect(screen.getByText("Active")).toHaveClass("ml-2");
  });
});
