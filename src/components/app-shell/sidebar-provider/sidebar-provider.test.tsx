import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SidebarProvider, useSidebar } from "./sidebar-provider";

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
  document.cookie =
    "admin-sidebar-collapsed=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
});

describe("SidebarProvider", () => {
  describe("on first mount", () => {
    it("defaults to expanded when no cookie is set", () => {
      render(
        <SidebarProvider>
          <Consumer />
        </SidebarProvider>,
      );
      expect(screen.getByTestId("collapsed")).toHaveTextContent("false");
    });

    it("picks up a pre-existing cookie value", async () => {
      document.cookie = "admin-sidebar-collapsed=1; path=/";
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
    it("flips what a consumer reads and persists the new state to a cookie", async () => {
      render(
        <SidebarProvider>
          <Consumer />
        </SidebarProvider>,
      );
      await userEvent.click(screen.getByRole("button", { name: "toggle" }));
      expect(screen.getByTestId("collapsed")).toHaveTextContent("true");
      expect(document.cookie).toContain("admin-sidebar-collapsed=1");

      await userEvent.click(screen.getByRole("button", { name: "toggle" }));
      expect(screen.getByTestId("collapsed")).toHaveTextContent("false");
      expect(document.cookie).toContain("admin-sidebar-collapsed=0");
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
