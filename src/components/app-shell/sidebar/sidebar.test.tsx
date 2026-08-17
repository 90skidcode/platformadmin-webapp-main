import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Session } from "next-auth";

import { filterNavByAccess } from "@/lib/permissions";
import { NAV_FIXTURE } from "../nav-fixture.test-util";
import { Sidebar } from "./sidebar";

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

function renderSidebar(session: Session | null) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <Sidebar nav={filterNavByAccess(NAV_FIXTURE, session)} />
    </NextIntlClientProvider>,
  );
}

describe("Sidebar", () => {
  it("hides a role-gated item for a session lacking that role", () => {
    renderSidebar(makeSession(["viewer"]));
    expect(
      screen.queryByRole("link", { name: "Settings" }),
    ).not.toBeInTheDocument();
  });

  it("shows a role-gated item once the session has that role", () => {
    renderSidebar(makeSession(["admin"]));
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });

  it("always shows an item with neither roles nor permission set", () => {
    renderSidebar(makeSession());
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("hides a permission-gated item the session lacks", () => {
    renderSidebar(makeSession());
    expect(
      screen.queryByRole("link", { name: "Users" }),
    ).not.toBeInTheDocument();
  });
});
