import { describe, expect, it } from "vitest";
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

function renderPage() {
  renderWithProviders(<RoleManagerPage />, {
    messages: { common: messages, tables: tablesMessages },
    session,
  });
}

describe("RoleManagerPage", () => {
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
    expect(screen.getByText("Screen Names")).toBeInTheDocument();

    // Default role rows (Super Admin link, Platform Admin link, Future Admin link)
    expect(screen.getByRole("link", { name: "Super Admin" })).toHaveAttribute(
      "href",
      "/role-manager/super-admin",
    );
    expect(
      screen.getByRole("link", { name: "Platform Admin" }),
    ).toHaveAttribute("href", "/role-manager/platform-admin");
    expect(screen.getByRole("link", { name: "Future Admin" })).toHaveAttribute(
      "href",
      "/role-manager/future-admin",
    );
  });
});
