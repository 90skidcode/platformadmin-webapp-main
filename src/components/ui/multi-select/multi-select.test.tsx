import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MultiSelect, type MultiSelectOption } from "./multi-select";

const defaultOptions: MultiSelectOption[] = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "svelte", label: "Svelte" },
  { value: "angular", label: "Angular", disabled: true },
];

function renderMultiSelect(
  props: Partial<Parameters<typeof MultiSelect>[0]> = {},
) {
  const onValueChange = vi.fn();
  render(
    <MultiSelect
      options={defaultOptions}
      placeholder="Choose frameworks"
      aria-label="Frameworks"
      onValueChange={onValueChange}
      {...props}
    />,
  );
  return { onValueChange };
}

describe("MultiSelect", () => {
  describe("when no options are selected", () => {
    it("should display the placeholder text and hide the clear all action", () => {
      renderMultiSelect();
      expect(screen.getByText("Choose frameworks")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Clear all selected options" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("when initial values are provided", () => {
    it("should display the selected options and the clear all action", () => {
      renderMultiSelect({ defaultValue: ["react", "svelte"] });
      expect(screen.getByText("React")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Remove React" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Svelte")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Remove Svelte" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Clear all selected options" }),
      ).toBeInTheDocument();
    });
  });

  describe("when interacting with the selection field", () => {
    it("should open the options list when clicking the selection area", async () => {
      const user = userEvent.setup();
      renderMultiSelect({ defaultValue: ["react"] });

      const combobox = screen.getByRole("combobox", { name: "Frameworks" });
      await user.click(combobox);

      expect(await screen.findByRole("listbox")).toBeInTheDocument();
    });

    it("should open the options list when clicking a selected item label", async () => {
      const user = userEvent.setup();
      renderMultiSelect({ defaultValue: ["react"] });

      const badgeText = screen.getByText("React");
      await user.click(badgeText);

      expect(await screen.findByRole("listbox")).toBeInTheDocument();
    });
  });

  describe("when clearing all selected values", () => {
    it("should remove all selections while keeping the options list closed", async () => {
      const user = userEvent.setup();
      const { onValueChange } = renderMultiSelect({
        defaultValue: ["react", "vue"],
      });

      const clearAllBtn = screen.getByRole("button", {
        name: "Clear all selected options",
      });
      await user.click(clearAllBtn);

      expect(onValueChange).toHaveBeenCalledWith([]);
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(screen.getByText("Choose frameworks")).toBeInTheDocument();
    });

    it("should remove all selections while keeping the options list open", async () => {
      const user = userEvent.setup();
      const { onValueChange } = renderMultiSelect({
        defaultValue: ["react", "vue"],
      });

      await user.click(screen.getByRole("combobox", { name: "Frameworks" }));
      expect(await screen.findByRole("listbox")).toBeInTheDocument();

      const clearAllBtn = screen.getByRole("button", {
        name: "Clear all selected options",
      });
      await user.click(clearAllBtn);

      expect(onValueChange).toHaveBeenCalledWith([]);
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("should allow clearing all selections using the keyboard", async () => {
      const user = userEvent.setup();
      const { onValueChange } = renderMultiSelect({
        defaultValue: ["react", "vue"],
      });

      const clearAllBtn = screen.getByRole("button", {
        name: "Clear all selected options",
      });
      clearAllBtn.focus();
      expect(clearAllBtn).toHaveFocus();

      await user.keyboard("{Enter}");

      expect(onValueChange).toHaveBeenCalledWith([]);
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("should disable the clear all action when the field is disabled", () => {
      renderMultiSelect({ defaultValue: ["react"], disabled: true });

      const clearAllBtn = screen.getByRole("button", {
        name: "Clear all selected options",
      });
      expect(clearAllBtn).toBeDisabled();
    });
  });

  describe("when removing a selected value via mouse", () => {
    it("should remove only that value and not toggle the dropdown", async () => {
      const user = userEvent.setup();
      const { onValueChange } = renderMultiSelect({
        defaultValue: ["react", "vue"],
      });

      const removeReactBtn = screen.getByRole("button", {
        name: "Remove React",
      });
      await user.click(removeReactBtn);

      expect(onValueChange).toHaveBeenCalledWith(["vue"]);
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("should remove the value and keep the dropdown open if it was already open", async () => {
      const user = userEvent.setup();
      const { onValueChange } = renderMultiSelect({
        defaultValue: ["react", "vue"],
      });

      await user.click(screen.getByRole("combobox", { name: "Frameworks" }));
      expect(await screen.findByRole("listbox")).toBeInTheDocument();

      const removeReactBtn = screen.getByRole("button", {
        name: "Remove React",
      });
      await user.click(removeReactBtn);

      expect(onValueChange).toHaveBeenCalledWith(["vue"]);
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });
  });

  describe("when removing a selected value via keyboard", () => {
    it("should allow focusing and activating the remove button with the Enter key", async () => {
      const user = userEvent.setup();
      const { onValueChange } = renderMultiSelect({
        defaultValue: ["react", "vue"],
      });

      const removeReactBtn = screen.getByRole("button", {
        name: "Remove React",
      });
      removeReactBtn.focus();
      expect(removeReactBtn).toHaveFocus();

      await user.keyboard("{Enter}");

      expect(onValueChange).toHaveBeenCalledWith(["vue"]);
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("should allow activating the remove button with the Space key", async () => {
      const user = userEvent.setup();
      const { onValueChange } = renderMultiSelect({
        defaultValue: ["react", "vue"],
      });

      const removeVueBtn = screen.getByRole("button", {
        name: "Remove Vue",
      });
      removeVueBtn.focus();
      await user.keyboard(" ");

      expect(onValueChange).toHaveBeenCalledWith(["react"]);
    });
  });

  describe("when the user opens the list and selects an option", () => {
    it("should add the selected option to the current selection", async () => {
      const user = userEvent.setup();
      const { onValueChange } = renderMultiSelect();

      await user.click(screen.getByRole("combobox", { name: "Frameworks" }));
      const option = await screen.findByRole("option", { name: "React" });
      await user.click(option);

      expect(onValueChange).toHaveBeenCalledWith(["react"]);
      expect(
        screen.getByRole("button", { name: "Remove React" }),
      ).toBeInTheDocument();
    });
  });

  describe("when selecting multiple options in sequence", () => {
    it("should display all selected options as badges", async () => {
      const user = userEvent.setup();
      renderMultiSelect();

      await user.click(screen.getByRole("combobox", { name: "Frameworks" }));
      const reactOption = await screen.findByRole("option", { name: "React" });
      await user.click(reactOption);

      const vueOption = screen.getByRole("option", { name: "Vue" });
      await user.click(vueOption);

      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Remove React" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Remove Vue" }),
      ).toBeInTheDocument();
    });
  });

  describe("when clicking an already selected option in the list", () => {
    it("should remove the option from the selection", async () => {
      const user = userEvent.setup();
      const { onValueChange } = renderMultiSelect({
        defaultValue: ["react", "vue"],
      });

      await user.click(screen.getByRole("combobox", { name: "Frameworks" }));
      const reactOption = await screen.findByRole("option", { name: "React" });
      await user.click(reactOption);

      expect(onValueChange).toHaveBeenCalledWith(["vue"]);
    });
  });

  describe("when search is enabled", () => {
    it("should filter the visible options when typing", async () => {
      const user = userEvent.setup();
      renderMultiSelect({ searchable: true });

      await user.click(screen.getByRole("combobox", { name: "Frameworks" }));
      const searchInput = await screen.findByRole("searchbox", {
        name: "Search options",
      });

      await user.type(searchInput, "Vue");

      expect(screen.getByRole("option", { name: "Vue" })).toBeInTheDocument();
      expect(
        screen.queryByRole("option", { name: "React" }),
      ).not.toBeInTheDocument();
    });

    it("should show an empty message when no options match the search", async () => {
      const user = userEvent.setup();
      renderMultiSelect({ searchable: true });

      await user.click(screen.getByRole("combobox", { name: "Frameworks" }));
      const searchInput = await screen.findByRole("searchbox", {
        name: "Search options",
      });

      await user.type(searchInput, "xyzNonExistent");

      expect(screen.getByText("No options found.")).toBeInTheDocument();
    });
  });

  describe("when search is not enabled", () => {
    it("should not display the search input inside the dropdown", async () => {
      const user = userEvent.setup();
      renderMultiSelect({ searchable: false });

      await user.click(screen.getByRole("combobox", { name: "Frameworks" }));
      await screen.findByRole("listbox");

      expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    });
  });

  describe("when the selection field is disabled", () => {
    it("should prevent opening the dropdown", async () => {
      const user = userEvent.setup();
      renderMultiSelect({ disabled: true });

      await user.click(screen.getByRole("combobox", { name: "Frameworks" }));

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("when an individual option is disabled", () => {
    it("should prevent selecting that specific option", async () => {
      const user = userEvent.setup();
      const { onValueChange } = renderMultiSelect();

      await user.click(screen.getByRole("combobox", { name: "Frameworks" }));
      const disabledOption = await screen.findByRole("option", {
        name: "Angular",
      });
      await user.click(disabledOption);

      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  describe("when navigating using the keyboard", () => {
    it("should open the dropdown when pressing Enter on the trigger", async () => {
      const user = userEvent.setup();
      renderMultiSelect();

      const trigger = screen.getByRole("combobox", { name: "Frameworks" });
      trigger.focus();
      await user.keyboard("{Enter}");

      expect(await screen.findByRole("listbox")).toBeInTheDocument();
    });

    it("should close the dropdown when pressing Escape", async () => {
      const user = userEvent.setup();
      renderMultiSelect();

      await user.click(screen.getByRole("combobox", { name: "Frameworks" }));
      expect(await screen.findByRole("listbox")).toBeInTheDocument();

      await user.keyboard("{Escape}");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });
});
