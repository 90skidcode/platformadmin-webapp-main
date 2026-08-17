import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import commonMessages from "@/messages/en/common.json";
import tablesMessages from "@/messages/en/tables.json";
import { renderWithProviders } from "@/test/test-utils";
import { buildSession } from "@/test/session-factory";
import AuditLogPage from "./page";

const session = buildSession({
  name: "Priya",
  roles: ["platform-admin"],
  permissions: ["audit.read"],
});

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
        JSON.stringify({
          code: "S_200_AUDIT_LIST_OK",
          message: "Audit log fetched successfully",
          data: {
            items: [entry],
            pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    ),
  );
  renderWithProviders(<AuditLogPage />, {
    messages: { common: commonMessages, tables: tablesMessages },
    session,
  });
}

describe("AuditLogPage", () => {
  describe("the entries table", () => {
    it("renders fetched entries, read-only (no edit/delete actions)", async () => {
      renderPage();
      expect(await screen.findByText("settings.update")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Delete/ }),
      ).not.toBeInTheDocument();
    });
  });

  describe("viewing an entry", () => {
    it("View opens a dialog with the before/after diff", async () => {
      renderPage();
      await userEvent.click(
        await screen.findByRole("button", { name: "View" }),
      );
      expect(
        screen.getByText(/"sessionTimeoutMinutes": 30/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/"sessionTimeoutMinutes": 60/),
      ).toBeInTheDocument();
    });
  });
});
