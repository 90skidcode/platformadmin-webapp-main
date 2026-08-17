import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Session } from "next-auth";

import { filterNavByAccess } from "@/lib/permissions";
import { NAV_FIXTURE } from "../nav-fixture.test-util";
import { BottomNav } from "./bottom-nav";

const messages = {
  common: {
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

function renderBottomNav(session: Session | null) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <BottomNav nav={filterNavByAccess(NAV_FIXTURE, session)} />
    </NextIntlClientProvider>,
  );
}

// Exactly the same fixture and assertions as sidebar.test.tsx -- proves a
// nav item hidden on desktop is guaranteed hidden on mobile too (plan §5).
describe("BottomNav", () => {
  it("hides a role-gated item for a session lacking that role", () => {
    renderBottomNav(makeSession(["viewer"]));
    expect(
      screen.queryByRole("link", { name: "Settings" }),
    ).not.toBeInTheDocument();
  });

  it("shows a role-gated item once the session has that role", () => {
    renderBottomNav(makeSession(["admin"]));
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });

  it("always shows an item with neither roles nor permission set", () => {
    renderBottomNav(makeSession());
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("hides a permission-gated item the session lacks", () => {
    renderBottomNav(makeSession());
    expect(
      screen.queryByRole("link", { name: "Users" }),
    ).not.toBeInTheDocument();
  });
});
