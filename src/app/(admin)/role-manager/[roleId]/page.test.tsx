import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";

import messages from "@/messages/en/common.json";
import tablesMessages from "@/messages/en/tables.json";
import { renderWithProviders } from "@/test/test-utils";
import { buildSession } from "@/test/session-factory";
import RoleDetailPage from "./page";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "mode" ? "view" : null),
  }),
}));

const session = buildSession({
  name: "Priya",
  roles: ["platform-admin"],
});

const mockScreens = [
  {
    id: "screen-1",
    code: "S1",
    name: "User Management",
    sort_order: 1,
    status: "active",
  },
  {
    id: "screen-2",
    code: "S2",
    name: "Audit Logs",
    sort_order: 2,
    status: "active",
  },
  {
    id: "screen-3",
    code: "S3",
    name: "Role Management",
    sort_order: 3,
    status: "active",
  },
  {
    id: "screen-4",
    code: "S4",
    name: "Screen Management",
    sort_order: 4,
    status: "active",
  },
];

const mockRole = {
  id: "7500f74e-0ee2-4c9d-badf-7e0ce6785cc8",
  name: "super_admin",
  description: "Full system control",
  status: "active",
  permissions: ["S1.R", "S1.W", "S2.R", "S3.R", "S3.W", "S4.R", "S4.W"],
};

function handleFetch(url: string | URL | Request, init?: RequestInit) {
  const urlStr = url.toString();
  if (urlStr.includes("/api/proxy/screens")) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          code: "S_200_SCR_LIST_OK",
          message: "Screens fetched successfully",
          data: {
            items: mockScreens,
            pagination: { page: 1, limit: 20, totalItems: 4, totalPages: 1 },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
  }

  if (urlStr.includes("/api/proxy/roles")) {
    if (init?.method === "PATCH" || init?.method === "POST") {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            code: "S_200_ROL_UPDATE_OK",
            message: "Role updated successfully",
            data: mockRole,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    }

    return Promise.resolve(
      new Response(
        JSON.stringify({
          code: "S_200_ROL_FETCH_OK",
          message: "Role fetched successfully",
          data: mockRole,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
  }

  return Promise.resolve(new Response("Not Found", { status: 404 }));
}

const fetchMock = vi.fn().mockImplementation(handleFetch);

describe("RoleDetailPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    fetchMock.mockReset();
    fetchMock.mockImplementation(handleFetch);
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders role form inputs and fetched screen permissions", async () => {
    const paramsPromise = Promise.resolve({
      roleId: "7500f74e-0ee2-4c9d-badf-7e0ce6785cc8",
    });

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
    expect(await screen.findByLabelText(/Role Name/i)).toHaveValue(
      "super_admin",
    );
    expect(screen.getByLabelText(/Status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toHaveValue(
      "Full system control",
    );

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
    expect(screen.getByText("User Management")).toBeInTheDocument();
    expect(screen.getByText("Audit Logs")).toBeInTheDocument();
    expect(screen.getByText("Role Management")).toBeInTheDocument();
    expect(screen.getByText("Screen Management")).toBeInTheDocument();

    // Checkboxes
    const userRead = screen.getByLabelText("User Management Read");
    const userWrite = screen.getByLabelText("User Management Write");
    const auditWrite = screen.getByLabelText("Audit Logs Write");

    expect(userRead).toBeChecked();
    expect(userWrite).toBeChecked();
    expect(auditWrite).not.toBeChecked();
  });

  it("renders empty fields in create mode and submits new role", async () => {
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

    expect(await screen.findByText("Create New Role")).toBeInTheDocument();
    const userRead = screen.getByLabelText("User Management Read");
    expect(userRead).not.toBeChecked();

    const nameInput = screen.getByLabelText(/Role Name/i);
    await userEvent.type(nameInput, "Auditor");
    await userEvent.click(userRead);

    const submitBtn = screen.getByRole("button", { name: /Create Role/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/role-manager");
    });
  });
});
