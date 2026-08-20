import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "next-auth";

import messages from "@/messages/en/common.json";
import tablesMessages from "@/messages/en/tables.json";
import { renderWithProviders } from "@/test/test-utils";
import { buildSession } from "@/test/session-factory";
import UsersPage from "./page";

const session = buildSession({
  name: "Priya",
  roles: ["platform-admin"],
  permissions: [
    "users.read",
    "users.invite",
    "users.write",
    "users.deactivate",
  ],
});

// A `Response` body stream can only be read once -- a fresh Response per
// call, not one shared instance, or the 2nd+ test to render the page (and
// thus re-fetch) gets an already-consumed body and silently falls back to
// "No results.".
function makeUsersResponse() {
  return new Response(
    JSON.stringify({
      code: "S_200_USR_LIST_OK",
      message: "Users fetched successfully",
      data: {
        items: [
          {
            id: "user-1",
            name: "Kavya Iyer",
            email: "kavya@acme.example",
            roles: ["viewer"],
            status: "active",
            lastLoginAt: null,
          },
        ],
        pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
const fetchMock = vi
  .fn()
  .mockImplementation(() => Promise.resolve(makeUsersResponse()));

function renderPage(sessionOverride: Session = session) {
  vi.stubGlobal("fetch", fetchMock);
  renderWithProviders(<UsersPage />, {
    messages: { common: messages, tables: tablesMessages },
    session: sessionOverride,
  });
}

describe("UsersPage", () => {
  describe("the Add/Invite user button", () => {
    it("shows for a session with users.invite", async () => {
      renderPage();
      expect(
        await screen.findByRole("button", {
          name: new RegExp(tablesMessages.users.actions.newUser, "i"),
        }),
      ).toBeInTheDocument();
    });

    it("hides for a session lacking users.invite", async () => {
      const noInvite = {
        ...session,
        user: { ...session.user, permissions: ["users.read"] },
      } as Session;
      renderPage(noInvite);
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      expect(
        screen.queryByRole("button", {
          name: new RegExp(tablesMessages.users.actions.newUser, "i"),
        }),
      ).not.toBeInTheDocument();
    });

    it("opens the user dialog on click", async () => {
      renderPage();
      await userEvent.click(
        await screen.findByRole("button", {
          name: new RegExp(tablesMessages.users.actions.newUser, "i"),
        }),
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("the users table", () => {
    it("renders the fetched user row", async () => {
      renderPage();
      expect(await screen.findByText("Kavya Iyer")).toBeInTheDocument();
    });
  });
});
