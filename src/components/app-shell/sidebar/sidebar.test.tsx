import { afterEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "next-auth";

import { filterNavByAccess } from "@/lib/permissions";
import { renderWithProviders } from "@/test/test-utils";
import { NAV_FIXTURE } from "../nav-fixture.test-util";
import { SidebarProvider, useSidebar } from "../sidebar-provider";
import { Sidebar } from "./sidebar";

const messages = {
  common: {
    app: { name: "Platform Admin" },
    nav: { dashboard: "Dashboard", users: "Users", settings: "Settings" },
  },
};

function makeSession(
  roles: string[] = [],
  permissions: string[] = [],
): Session {
  return {
    user: { id: "u1", roles, permissions, tenants: [] },
    accessToken: "token",
    expires: "2099-01-01T00:00:00.000Z",
  } as Session;
}

/** Sidebar reads `useSidebar()` -- every render needs a SidebarProvider
 * ancestor, same as it needs an intl provider for its labels. */
function renderSidebar(session: Session | null) {
  renderWithProviders(
    <SidebarProvider>
      <Sidebar nav={filterNavByAccess(NAV_FIXTURE, session)} />
    </SidebarProvider>,
    { messages },
  );
}

/** Same as `renderSidebar`, plus a button wired to SidebarProvider's
 * `toggle` -- lets collapse behavior be exercised without going through
 * Topbar (a separate component/test file). */
function renderSidebarWithToggle(session: Session | null) {
  function ToggleButton() {
    const { toggle } = useSidebar();
    return <button onClick={toggle}>toggle</button>;
  }
  renderWithProviders(
    <SidebarProvider>
      <ToggleButton />
      <Sidebar nav={filterNavByAccess(NAV_FIXTURE, session)} />
    </SidebarProvider>,
    { messages },
  );
}

afterEach(() => {
  window.localStorage.removeItem("admin-sidebar-collapsed");
});

describe("Sidebar", () => {
  describe("role-gated items", () => {
    it("hides an item for a session lacking the required role", () => {
      renderSidebar(makeSession(["viewer"]));
      expect(
        screen.queryByRole("link", { name: "Settings" }),
      ).not.toBeInTheDocument();
    });

    it("shows an item once the session has the required role", () => {
      renderSidebar(makeSession(["admin"]));
      expect(
        screen.getByRole("link", { name: "Settings" }),
      ).toBeInTheDocument();
    });
  });

  describe("permission-gated items", () => {
    it("hides an item the session lacks the permission for", () => {
      renderSidebar(makeSession());
      expect(
        screen.queryByRole("link", { name: "Users" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("ungated items", () => {
    it("always shows an item with neither roles nor permission set", () => {
      renderSidebar(makeSession());
      expect(
        screen.getByRole("link", { name: "Dashboard" }),
      ).toBeInTheDocument();
    });
  });

  describe("collapsed state (default)", () => {
    it("hides the wordmark but keeps every nav item reachable by its accessible name", () => {
      renderSidebar(makeSession());
      expect(screen.queryByText("Platform Admin")).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Dashboard" }),
      ).toBeInTheDocument();
    });
  });

  describe("expanded state", () => {
    it("shows the wordmark logo and nav item labels", async () => {
      renderSidebarWithToggle(makeSession());
      await userEvent.click(screen.getByRole("button", { name: "toggle" }));

      expect(screen.getByText("Platform Admin")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Dashboard" }),
      ).toBeInTheDocument();
    });
  });
});
