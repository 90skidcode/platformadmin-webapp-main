import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  describe("default state", () => {
    it("starts unchecked", () => {
      render(<Checkbox aria-label="agree" />);
      expect(screen.getByRole("checkbox", { name: "agree" })).not.toBeChecked();
    });
  });

  describe("clicking", () => {
    it("toggles checked state and calls onCheckedChange", async () => {
      const onCheckedChange = vi.fn();
      render(<Checkbox aria-label="agree" onCheckedChange={onCheckedChange} />);
      await userEvent.click(screen.getByRole("checkbox", { name: "agree" }));
      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it("does not respond when disabled", async () => {
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

  describe("indeterminate state", () => {
    it("renders it via the checked prop", () => {
      render(<Checkbox aria-label="agree" checked="indeterminate" />);
      expect(screen.getByRole("checkbox", { name: "agree" })).toHaveAttribute(
        "data-state",
        "indeterminate",
      );
    });
  });
});
