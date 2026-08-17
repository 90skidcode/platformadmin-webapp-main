import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

import { EnvironmentProvider } from "@/lib/environment";
import { TenantProvider } from "@/lib/tenant";
import { AppShell } from "./app-shell";

// True responsive behavior (375px vs 1280px) is exercised for real in
// e2e/responsive.spec.ts (plan §15) -- jsdom has no layout engine, so this
// unit test only proves Sidebar + Topbar + BottomNav + content all compose,
// each given the same `nav`.
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

const session = {
  user: { id: "u1", name: "Priya", roles: [], permissions: [], tenants: [] },
  accessToken: "t",
  expires: "2099-01-01T00:00:00.000Z",
} as Session;

describe("AppShell", () => {
  it("renders the sidebar, topbar, bottom nav, and page content together", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SessionProvider session={session}>
          <EnvironmentProvider>
            <TenantProvider>
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
              </AppShell>
            </TenantProvider>
          </EnvironmentProvider>
        </SessionProvider>
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(screen.getByText("Priya")).toBeInTheDocument(); // topbar title
    // Sidebar and BottomNav both render the same nav item (one link each).
    expect(screen.getAllByRole("link", { name: "Dashboard" })).toHaveLength(2);
  });
});
