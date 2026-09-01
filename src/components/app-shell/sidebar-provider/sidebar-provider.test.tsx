import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SidebarProvider, useSidebar } from "./sidebar-provider";

const STORAGE_KEY = "admin-sidebar-collapsed";

function Consumer() {
  const { collapsed, toggle } = useSidebar();
  return (
    <div>
      <span data-testid="collapsed">{String(collapsed)}</span>
      <button onClick={toggle}>toggle</button>
    </div>
  );
}

afterEach(() => {
  window.localStorage.removeItem(STORAGE_KEY);
});

describe("SidebarProvider", () => {
  describe("on first mount", () => {
    it("defaults to expanded when no preference is stored", () => {
      render(
        <SidebarProvider>
          <Consumer />
        </SidebarProvider>,
      );
      expect(screen.getByTestId("collapsed")).toHaveTextContent("false");
    });

    it("picks up a pre-existing stored preference", async () => {
      window.localStorage.setItem(STORAGE_KEY, "1");
      render(
        <SidebarProvider>
          <Consumer />
        </SidebarProvider>,
      );
      await waitFor(() =>
        expect(screen.getByTestId("collapsed")).toHaveTextContent("true"),
      );
    });
  });

  describe("toggling", () => {
    it("flips what a consumer reads and persists the new state to localStorage", async () => {
      render(
        <SidebarProvider>
          <Consumer />
        </SidebarProvider>,
      );
      await userEvent.click(screen.getByRole("button", { name: "toggle" }));
      expect(screen.getByTestId("collapsed")).toHaveTextContent("true");
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe("1");

      await userEvent.click(screen.getByRole("button", { name: "toggle" }));
      expect(screen.getByTestId("collapsed")).toHaveTextContent("false");
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe("0");
    });
  });

  describe("used outside the provider", () => {
    it("throws", () => {
      function Bare() {
        useSidebar();
        return null;
      }
      expect(() => render(<Bare />)).toThrow(/SidebarProvider/);
    });
  });
});
