import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

import messages from "@/messages/en/common.json";
import tablesMessages from "@/messages/en/tables.json";
import UsersPage from "./page";

const session = {
  user: {
    id: "u1",
    name: "Priya",
    roles: ["platform-admin"],
    permissions: [
      "users.read",
      "users.invite",
      "users.write",
      "users.deactivate",
    ],
    tenants: [],
  },
  accessToken: "t",
  expires: "2099-01-01T00:00:00.000Z",
} as Session;

// A `Response` body stream can only be read once -- a fresh Response per
// call, not one shared instance, or the 2nd+ test to render the page (and
// thus re-fetch) gets an already-consumed body and silently falls back to
// "No results.".
function makeUsersResponse() {
  return new Response(
    JSON.stringify({
      data: [
        {
          id: "user-1",
          name: "Kavya Iyer",
          email: "kavya@acme.example",
          roles: ["viewer"],
          status: "active",
          lastLoginAt: null,
        },
      ],
      page: 1,
      pageSize: 10,
      total: 1,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
const fetchMock = vi
  .fn()
  .mockImplementation(() => Promise.resolve(makeUsersResponse()));

function renderPage(sessionOverride: Session = session) {
  vi.stubGlobal("fetch", fetchMock);
  render(
    <NextIntlClientProvider
      locale="en"
      messages={{ common: messages, tables: tablesMessages }}
    >
      <SessionProvider session={sessionOverride}>
        <UsersPage />
      </SessionProvider>
    </NextIntlClientProvider>,
  );
}

describe("UsersPage", () => {
  it("shows the Invite user button for a session with users.invite", async () => {
    renderPage();
    expect(
      await screen.findByRole("button", { name: /Invite user/ }),
    ).toBeInTheDocument();
  });

  it("hides the Invite user button for a session lacking users.invite", async () => {
    const noInvite = {
      ...session,
      user: { ...session.user, permissions: ["users.read"] },
    } as Session;
    renderPage(noInvite);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(
      screen.queryByRole("button", { name: /Invite user/ }),
    ).not.toBeInTheDocument();
  });

  it("opens the invite dialog on click", async () => {
    renderPage();
    await userEvent.click(
      await screen.findByRole("button", { name: /Invite user/ }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders the fetched user row", async () => {
    renderPage();
    expect(await screen.findByText("Kavya Iyer")).toBeInTheDocument();
  });
});
