import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Toaster } from "./toaster";
import { dismissAllToasts, toast } from "./use-toast";

// The toast store is module-level (not React context), so it persists across
// tests in this file -- clear it out after each one.
afterEach(() => {
  dismissAllToasts();
});

describe("Toast", () => {
  describe("with no toasts", () => {
    it("renders nothing", () => {
      render(<Toaster />);
      expect(screen.queryByText(/./)).not.toBeInTheDocument();
    });
  });

  describe("after toast() is called", () => {
    it("shows the toast's title and description", async () => {
      render(<Toaster />);
      toast({
        title: "Saved",
        description: "Employee created.",
        variant: "success",
      });
      expect(await screen.findByText("Saved")).toBeInTheDocument();
      expect(screen.getByText("Employee created.")).toBeInTheDocument();
    });

    it("dismisses via the close button", async () => {
      render(<Toaster />);
      toast({ title: "Saved" });
      await screen.findByText("Saved");
      await userEvent.click(screen.getByRole("button", { name: /close/i }));
      await waitFor(() =>
        expect(screen.queryByText("Saved")).not.toBeInTheDocument(),
      );
    });

    it("caps the number of simultaneously visible toasts", async () => {
      render(<Toaster />);
      for (let i = 0; i < 6; i += 1) {
        toast({ title: `Toast ${i}` });
      }
      await screen.findByText("Toast 5");
      expect(screen.queryByText("Toast 0")).not.toBeInTheDocument();
    });
  });
});
