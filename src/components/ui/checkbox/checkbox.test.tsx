import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("starts unchecked by default", () => {
    render(<Checkbox aria-label="agree" />);
    expect(screen.getByRole("checkbox", { name: "agree" })).not.toBeChecked();
  });

  it("toggles checked state on click and calls onCheckedChange", async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="agree" onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "agree" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("renders the indeterminate state", () => {
    render(<Checkbox aria-label="agree" checked="indeterminate" />);
    expect(screen.getByRole("checkbox", { name: "agree" })).toHaveAttribute(
      "data-state",
      "indeterminate",
    );
  });

  it("does not respond to clicks when disabled", async () => {
    const onCheckedChange = vi.fn();
    render(
      <Checkbox
        aria-label="agree"
        disabled
        onCheckedChange={onCheckedChange}
      />,
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "agree" }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
