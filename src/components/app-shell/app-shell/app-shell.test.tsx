import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { EnvironmentProvider } from "@/lib/environment";
import { TenantProvider } from "@/lib/tenant";
import { renderWithProviders } from "@/test/test-utils";
import { buildSession } from "@/test/session-factory";
import { AppShell } from "./app-shell";

// True responsive behavior (375px vs 1280px) is exercised for real by
// driving an actual browser (see this session's manual smoke-test notes) --
// jsdom has no layout engine, so this unit test only proves Sidebar +
// Topbar + BottomNav + content all compose, each given the same `nav`.
const messages = {
  common: {
    app: { name: "Platform Admin" },
    actions: { signOut: "Sign out" },
    nav: { dashboard: "Dashboard" },
    environments: {
      dev: "Development",
      staging: "Staging",
      production: "Production",
    },
    topbar: {
      environment: "Environment",
      tenant: "Tenant",
      myAccount: "My Account",
      profile: "Profile",
    },
  },
};

describe("AppShell", () => {
  describe("composing its parts", () => {
    it("renders the sidebar, topbar, bottom nav, and page content together", () => {
      renderWithProviders(
        <AppShell
          nav={[
            {
              id: "dashboard",
              labelKey: "nav.dashboard",
              href: "/",
              icon: "layoutDashboard",
            },
          ]}
          title="Priya"
        >
          <p>Page content</p>
        </AppShell>,
        {
          messages,
          session: buildSession({ name: "Priya" }),
          wrap: (children) => (
            <EnvironmentProvider>
              <TenantProvider>{children}</TenantProvider>
            </EnvironmentProvider>
          ),
        },
      );

      expect(screen.getByText("Page content")).toBeInTheDocument();
      expect(screen.getByText("Priya")).toBeInTheDocument(); // topbar title
      // Sidebar and BottomNav both render the same nav item (one link each).
      expect(screen.getAllByRole("link", { name: "Dashboard" })).toHaveLength(
        2,
      );
    });
  });
});
