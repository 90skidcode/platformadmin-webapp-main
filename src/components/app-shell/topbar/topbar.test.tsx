import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

import { EnvironmentProvider } from "@/lib/environment";
import { TenantProvider } from "@/lib/tenant";
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
  },
};

const session = {
  user: {
    id: "u1",
    name: "Priya Sharma",
    email: "admin@platform.local",
    roles: ["platform-admin"],
    permissions: [],
    tenants: [],
  },
  accessToken: "token",
  expires: "2099-01-01T00:00:00.000Z",
} as Session;

function renderTopbar(title?: string) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SessionProvider session={session}>
        <EnvironmentProvider>
          <TenantProvider>
            <Topbar title={title} />
          </TenantProvider>
        </EnvironmentProvider>
      </SessionProvider>
    </NextIntlClientProvider>,
  );
}

describe("Topbar", () => {
  it("shows the given title, falling back to the app name", () => {
    renderTopbar("Priya Sharma");
    expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
  });

  it("shows the user's initials as the avatar fallback", () => {
    renderTopbar();
    expect(screen.getByText("PS")).toBeInTheDocument();
  });

  it("opens the user menu and shows the session's role badges", async () => {
    renderTopbar();
    await userEvent.click(screen.getByRole("button", { name: /PS/i }));
    expect(screen.getByText("platform-admin")).toBeInTheDocument();
  });

  it("sign out clears the environment/tenant cookies and calls next-auth signOut", async () => {
    document.cookie = "admin-environment=staging; path=/";
    document.cookie = "admin-tenant=globex; path=/";
    renderTopbar();
    await userEvent.click(screen.getByRole("button", { name: /PS/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: "/login" });
    expect(document.cookie).not.toContain("admin-environment=staging");
    expect(document.cookie).not.toContain("admin-tenant=globex");
  });
});
