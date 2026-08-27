import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { Session } from "next-auth";

import messages from "@/messages/en/common.json";
import tablesMessages from "@/messages/en/tables.json";
import { renderWithProviders } from "@/test/test-utils";
import { buildSession } from "@/test/session-factory";
import AuditLogsPage from "./page";

const session = buildSession({
  name: "Priya",
  roles: ["platform-admin"],
});

function makeAuditLogsResponse() {
  return new Response(
    JSON.stringify({
      code: "S_200_AUDIT_LIST_OK",
      message: "Audit logs fetched successfully",
      data: {
        items: [
          {
            id: "log-1",
            actor: "admin@acme.example",
            action: "auth.login.success",
            resource_type: "auth",
            resource_id: "user-123",
            actor_type: "user",
            ip_address: "127.0.0.1",
            created_at: "2026-08-27T10:00:00.000Z",
          },
        ],
        pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

const fetchMock = vi
  .fn()
  .mockImplementation(() => Promise.resolve(makeAuditLogsResponse()));

function renderPage(sessionOverride: Session = session) {
  vi.stubGlobal("fetch", fetchMock);
  renderWithProviders(<AuditLogsPage />, {
    messages: { common: messages, tables: tablesMessages },
    session: sessionOverride,
  });
}

describe("AuditLogsPage", () => {
  it("renders audit log header, filters, and fetched table rows", async () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Audit Logs" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("admin@acme.example")).toBeInTheDocument();
    expect(await screen.findByText("auth.login.success")).toBeInTheDocument();
    expect(await screen.findByText("auth")).toBeInTheDocument();
    expect(await screen.findByText("127.0.0.1")).toBeInTheDocument();

    // Verify delete button is not present
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });
});
