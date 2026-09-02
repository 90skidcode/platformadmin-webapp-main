import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EnvironmentProvider } from "@/lib/environment";
import { TenantProvider } from "@/lib/tenant";
import { renderWithProviders } from "@/test/test-utils";
import { buildSession } from "@/test/session-factory";
import { SidebarProvider } from "../sidebar-provider";
import { Topbar } from "./topbar";

const signOutMock = vi.fn();
vi.mock("next-auth/react", async () => {
  const actual =
    await vi.importActual<typeof import("next-auth/react")>("next-auth/react");
  return { ...actual, signOut: (...args: unknown[]) => signOutMock(...args) };
});

const messages = {
  common: {
    app: { name: "Platform Admin" },
    actions: { signOut: "Sign out" },
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
    sidebar: {
      collapse: "Collapse sidebar",
      expand: "Expand sidebar",
    },
  },
};

const session = buildSession({
  name: "Priya Sharma",
  email: "admin@platform.local",
  roles: ["platform-admin"],
});

function renderTopbar(title?: string) {
  renderWithProviders(<Topbar title={title} />, {
    messages,
    session,
    wrap: (children) => (
      <SidebarProvider>
        <EnvironmentProvider>
          <TenantProvider>{children}</TenantProvider>
        </EnvironmentProvider>
      </SidebarProvider>
    ),
  });
}

describe("Topbar", () => {
  describe("the title", () => {
    it("shows the given title", () => {
      renderTopbar("Priya Sharma");
      expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    });

    it("falls back to the user's initials as the avatar fallback when no title is given", () => {
      renderTopbar();
      expect(screen.getByText("PS")).toBeInTheDocument();
    });
  });

  describe("the account menu", () => {
    it("opens and shows the session's role badges", async () => {
      renderTopbar();
      await userEvent.click(screen.getByRole("button", { name: "PS" }));
      expect(screen.getByText("platform-admin")).toBeInTheDocument();
    });

    it("sign out clears the environment/tenant cookies and calls next-auth signOut", async () => {
      document.cookie = "admin-environment=staging; path=/";
      document.cookie = "admin-tenant=globex; path=/";
      renderTopbar();
      await userEvent.click(screen.getByRole("button", { name: "PS" }));
      await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
      expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: "/login" });
      expect(document.cookie).not.toContain("admin-environment=staging");
      expect(document.cookie).not.toContain("admin-tenant=globex");
    });
  });

  describe("the sidebar toggle", () => {
    it("labels the button 'Collapse sidebar' while expanded (default), then 'Expand sidebar' once clicked", async () => {
      renderTopbar();
      const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
      await userEvent.click(toggle);
      expect(
        screen.getByRole("button", { name: "Expand sidebar" }),
      ).toBeInTheDocument();
    });
  });
});
