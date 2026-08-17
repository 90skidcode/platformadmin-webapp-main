import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Button } from "./button";

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

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

  it("disables and marks aria-busy while loading, without dropping the label", () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("merges a custom className with the variant classes", () => {
    render(<Button className="w-full">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("w-full");
  });

  it("renders as the child element when asChild is set", () => {
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
