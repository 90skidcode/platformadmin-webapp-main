import { describe, expect, it, vi } from "vitest";
import { screen, act } from "@testing-library/react";
import { Suspense } from "react";

import messages from "@/messages/en/common.json";
import tablesMessages from "@/messages/en/tables.json";
import { renderWithProviders } from "@/test/test-utils";
import { buildSession } from "@/test/session-factory";
import RoleDetailPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "mode" ? "view" : null),
  }),
}));

const session = buildSession({
  name: "Priya",
  roles: ["platform-admin"],
});

describe("RoleDetailPage (Unified Metadata & Permission Table)", () => {
  it("renders role form inputs (name, description, screens) and permissions table", async () => {
    const paramsPromise = Promise.resolve({ roleId: "super-admin" });

    await act(async () => {
      renderWithProviders(
        <Suspense fallback={<div>Loading...</div>}>
          <RoleDetailPage params={paramsPromise} />
        </Suspense>,
        {
          messages: { common: messages, tables: tablesMessages },
          session,
        },
      );
    });

    // Form inputs
    expect(screen.getByLabelText(/Role Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Screen Names/i)).toBeInTheDocument();

    // Table column headers
    expect(
      screen.getByRole("columnheader", { name: "Screen Name" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Read" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Write" }),
    ).toBeInTheDocument();

    // Screen Name rows
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("User")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();

    // Checkboxes
    expect(screen.getByLabelText("Dashboard Read")).toBeInTheDocument();
    expect(screen.getByLabelText("Dashboard Write")).toBeInTheDocument();
  });

  it("renders empty fields and unchecked checkboxes in create mode", async () => {
    const paramsPromise = Promise.resolve({ roleId: "new" });

    await act(async () => {
      renderWithProviders(
        <Suspense fallback={<div>Loading...</div>}>
          <RoleDetailPage params={paramsPromise} />
        </Suspense>,
        {
          messages: { common: messages, tables: tablesMessages },
          session,
        },
      );
    });

    expect(screen.getByText("Create New Role")).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/Role Name/i) as HTMLInputElement;
    expect(nameInput.value).toBe("");

    const dashboardRead = screen.getByLabelText(
      "Dashboard Read",
    ) as HTMLInputElement;
    expect(dashboardRead.checked).toBe(false);

    expect(
      screen.getByRole("button", { name: /Create Role/i }),
    ).toBeInTheDocument();
  });
});
