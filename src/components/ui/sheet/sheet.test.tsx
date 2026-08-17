import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
import { Button } from "../button/button";

function renderSheet() {
  render(
    <Sheet>
      <SheetTrigger asChild>
        <Button>Edit roles</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit roles for Kavya</SheetTitle>
          <SheetDescription>Change what this user can access.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <Button>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>,
  );
}

describe("Sheet", () => {
  describe("before the trigger is clicked", () => {
    it("is closed", () => {
      renderSheet();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("after the trigger is clicked", () => {
    it("opens and shows its title/description", async () => {
      renderSheet();
      await userEvent.click(screen.getByRole("button", { name: "Edit roles" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Edit roles for Kavya")).toBeInTheDocument();
    });

    it("closes via the built-in close button", async () => {
      renderSheet();
      await userEvent.click(screen.getByRole("button", { name: "Edit roles" }));
      await userEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes via Escape", async () => {
      renderSheet();
      await userEvent.click(screen.getByRole("button", { name: "Edit roles" }));
      await userEvent.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
