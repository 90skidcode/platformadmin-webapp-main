import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

function renderSelect(onValueChange = vi.fn()) {
  render(
    <Select onValueChange={onValueChange}>
      <SelectTrigger aria-label="environment">
        <SelectValue placeholder="Choose environment" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="dev">Development</SelectItem>
        <SelectItem value="staging">Staging</SelectItem>
        <SelectItem value="production">Production</SelectItem>
      </SelectContent>
    </Select>,
  );
  return onValueChange;
}

describe("Select", () => {
  describe("before anything is selected", () => {
    it("shows the placeholder", () => {
      renderSelect();
      expect(screen.getByText("Choose environment")).toBeInTheDocument();
    });
  });

  describe("selecting an option", () => {
    it("opens the option list and calls onValueChange", async () => {
      const onValueChange = renderSelect();
      await userEvent.click(
        screen.getByRole("combobox", { name: "environment" }),
      );
      const option = await screen.findByRole("option", { name: "Staging" });
      await userEvent.click(option);
      expect(onValueChange).toHaveBeenCalledWith("staging");
    });
  });

  describe("as a controlled component", () => {
    it("reflects the given value in the trigger", () => {
      render(
        <Select value="production">
          <SelectTrigger aria-label="environment">
            <SelectValue placeholder="Choose environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="production">Production</SelectItem>
          </SelectContent>
        </Select>,
      );
      expect(screen.getByText("Production")).toBeInTheDocument();
    });
  });
});
