import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Switch } from "./switch";

describe("Switch", () => {
  it("starts unchecked by default", () => {
    render(<Switch aria-label="notifications" />);
    expect(
      screen.getByRole("switch", { name: "notifications" }),
    ).not.toBeChecked();
  });

  it("toggles on click and calls onCheckedChange", async () => {
    const onCheckedChange = vi.fn();
    render(
      <Switch aria-label="notifications" onCheckedChange={onCheckedChange} />,
    );
    await userEvent.click(
      screen.getByRole("switch", { name: "notifications" }),
    );
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("supports a controlled checked value", () => {
    render(
      <Switch aria-label="notifications" checked onCheckedChange={() => {}} />,
    );
    expect(screen.getByRole("switch", { name: "notifications" })).toBeChecked();
  });

  it("does not respond to clicks when disabled", async () => {
    const onCheckedChange = vi.fn();
    render(
      <Switch
        aria-label="notifications"
        disabled
        onCheckedChange={onCheckedChange}
      />,
    );
    await userEvent.click(
      screen.getByRole("switch", { name: "notifications" }),
    );
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
