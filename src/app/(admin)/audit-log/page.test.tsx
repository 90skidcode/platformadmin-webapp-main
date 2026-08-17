import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

import commonMessages from "@/messages/en/common.json";
import tablesMessages from "@/messages/en/tables.json";
import AuditLogPage from "./page";

const session = {
  user: {
    id: "u1",
    name: "Priya",
    roles: ["platform-admin"],
    permissions: ["audit.read"],
    tenants: [],
  },
  accessToken: "t",
  expires: "2099-01-01T00:00:00.000Z",
} as Session;

const entry = {
  id: "audit-1",
  actor: "admin@platform.local",
  action: "settings.update",
  entity: "settings",
  timestamp: "2026-08-14T09:30:00.000Z",
  before: { sessionTimeoutMinutes: 30 },
  after: { sessionTimeoutMinutes: 60 },
};

function renderPage() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ data: [entry], page: 1, pageSize: 10, total: 1 }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    ),
  );
  render(
    <NextIntlClientProvider
      locale="en"
      messages={{ common: commonMessages, tables: tablesMessages }}
    >
      <SessionProvider session={session}>
        <AuditLogPage />
      </SessionProvider>
    </NextIntlClientProvider>,
  );
}

describe("AuditLogPage", () => {
  it("renders fetched entries, read-only (no edit/delete actions)", async () => {
    renderPage();
    expect(await screen.findByText("settings.update")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Delete/ }),
    ).not.toBeInTheDocument();
  });

  it("View opens a dialog with the before/after diff", async () => {
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "View" }));
    expect(screen.getByText(/"sessionTimeoutMinutes": 30/)).toBeInTheDocument();
    expect(screen.getByText(/"sessionTimeoutMinutes": 60/)).toBeInTheDocument();
  });
});
