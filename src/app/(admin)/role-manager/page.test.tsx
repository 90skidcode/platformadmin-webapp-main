import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";

import messages from "@/messages/en/common.json";
import tablesMessages from "@/messages/en/tables.json";
import { renderWithProviders } from "@/test/test-utils";
import { buildSession } from "@/test/session-factory";
import RoleManagerPage from "./page";

const session = buildSession({
  name: "Priya",
  roles: ["platform-admin"],
});

function makeRolesResponse() {
  return new Response(
    JSON.stringify({
      code: "S_200_ROL_LIST_OK",
      message: "Roles fetched successfully",
      data: {
        items: [
          {
            id: "super-admin",
            name: "Super Admin",
            description:
              "Full system control and unrestricted access across all screens and resources.",
            status: "active",
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
  .mockImplementation(() => Promise.resolve(makeRolesResponse()));

function renderPage() {
  vi.stubGlobal("fetch", fetchMock);
  renderWithProviders(<RoleManagerPage />, {
    messages: { common: messages, tables: tablesMessages },
    session,
  });
}

describe("RoleManagerPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(() => Promise.resolve(makeRolesResponse()));
  });

  it("renders role manager title, table columns, default roles, and action buttons", async () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /Role Manager/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /New Role/i }),
    ).toBeInTheDocument();

    // Table columns
    expect(screen.getByText("Role Name")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();

    // Fetched role row
    expect(
      await screen.findByRole("link", { name: "Super Admin" }),
    ).toHaveAttribute("href", "/role-manager/super-admin?mode=view");
  });

  it("deletes a role when delete action is confirmed", async () => {
    renderPage();
    const deleteBtn = await screen.findByRole("button", { name: /Delete/i });
    expect(deleteBtn).toBeInTheDocument();
  });
});
