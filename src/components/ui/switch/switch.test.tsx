import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Switch } from "./switch";

describe("Switch", () => {
  describe("default state", () => {
    it("starts unchecked", () => {
      render(<Switch aria-label="notifications" />);
      expect(
        screen.getByRole("switch", { name: "notifications" }),
      ).not.toBeChecked();
    });
  });

  describe("clicking", () => {
    it("toggles on and calls onCheckedChange", async () => {
      const onCheckedChange = vi.fn();
      render(
        <Switch aria-label="notifications" onCheckedChange={onCheckedChange} />,
      );
      await userEvent.click(
        screen.getByRole("switch", { name: "notifications" }),
      );
      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it("does not respond when disabled", async () => {
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

  describe("controlled usage", () => {
    it("reflects a controlled checked value", () => {
      render(
        <Switch
          aria-label="notifications"
          checked
          onCheckedChange={() => {}}
        />,
      );
      expect(
        screen.getByRole("switch", { name: "notifications" }),
      ).toBeChecked();
    });
  });
});
