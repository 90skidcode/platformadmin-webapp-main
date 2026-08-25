import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders a pulsing placeholder block, hidden from assistive tech", () => {
    const { container } = render(<Skeleton data-testid="skeleton" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass("animate-pulse");
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("merges a custom className", () => {
    const { container } = render(<Skeleton className="h-4 w-3/4" />);
    expect(container.firstChild).toHaveClass("h-4", "w-3/4");
  });
});
