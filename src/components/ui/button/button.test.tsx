import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Button } from "./button";

describe("Button", () => {
  describe("rendering", () => {
    it("renders its children", () => {
      render(<Button>Save</Button>);
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });

    it("merges a custom className with the variant classes", () => {
      render(<Button className="w-full">Save</Button>);
      expect(screen.getByRole("button", { name: "Save" })).toHaveClass(
        "w-full",
      );
    });
  });

  describe("clicking", () => {
    it("fires onClick when enabled", async () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Save</Button>);
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(onClick).toHaveBeenCalledOnce();
    });

    it("does not fire onClick when disabled", async () => {
      const onClick = vi.fn();
      render(
        <Button onClick={onClick} disabled>
          Save
        </Button>,
      );
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("loading state", () => {
    it("disables and marks aria-busy while loading, without dropping the label", () => {
      render(<Button loading>Save</Button>);
      const button = screen.getByRole("button", { name: "Save" });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-busy", "true");
    });
  });

  describe("asChild", () => {
    it("renders as the child element instead of a <button>", () => {
      render(
        <Button asChild>
          <a href="/employees">Employees</a>
        </Button>,
      );
      const link = screen.getByRole("link", { name: "Employees" });
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe("A");
    });
  });
});
