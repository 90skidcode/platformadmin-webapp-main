import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import type { Session } from "next-auth";

import { filterNavByAccess } from "@/lib/permissions";
import { renderWithProviders } from "@/test/test-utils";
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
  renderWithProviders(
    <Sidebar nav={filterNavByAccess(NAV_FIXTURE, session)} />,
    { messages },
  );
}

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
});
