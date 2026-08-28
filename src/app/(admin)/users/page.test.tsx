import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "next-auth";

import messages from "@/messages/en/common.json";
import tablesMessages from "@/messages/en/tables.json";
import { renderWithProviders } from "@/test/test-utils";
import { buildSession } from "@/test/session-factory";
import { Toaster } from "@/components/toast";
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
            status: "active",
            created_at: "2026-08-14T09:12:00.000Z",
            updated_at: "2026-08-14T09:12:00.000Z",
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
  renderWithProviders(
    <>
      <Toaster />
      <UsersPage />
    </>,
    {
      messages: { common: messages, tables: tablesMessages },
      session: sessionOverride,
    },
  );
}

/** Finds the fetch call made with the given HTTP method -- the initial
 * table load is always a GET, so this is how a test picks out the PATCH/
 * DELETE a row action triggers, out of every call `fetchMock` recorded. */
function findCallByMethod(method: string) {
  return fetchMock.mock.calls.find(
    ([, init]) => (init as RequestInit | undefined)?.method === method,
  );
}

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
  usePathname: () => "/users",
  useSearchParams: () => new URLSearchParams(),
}));

describe("UsersPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    fetchMock.mockReset();
    fetchMock.mockImplementation(() => Promise.resolve(makeUsersResponse()));
  });

  describe("the Add User button", () => {
    it("shows for a session with users.invite", async () => {
      renderPage();
      expect(
        await screen.findByRole("button", { name: /Add User/ }),
      ).toBeInTheDocument();
    });

    // Skipped: the `users.invite` gate on this button is temporarily
    // stripped (no roles/permissions source from the backend yet, see
    // users-table.ts) -- re-enable once that gate comes back.
    it.skip("hides for a session lacking users.invite", () => {
      const noInviteSession = buildSession({
        permissions: ["users.read"],
      });
      renderPage(noInviteSession);
      expect(
        screen.queryByRole("button", { name: /Add User/ }),
      ).not.toBeInTheDocument();
    });

    it("opens the invite dialog on click", async () => {
      renderPage();
      await userEvent.click(
        await screen.findByRole("button", { name: /Add User/ }),
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

  describe("editing a user", () => {
    it("opens pre-filled with the row's data and PATCHes { name, email, status } on save", async () => {
      renderPage();
      await userEvent.click(
        await screen.findByRole("button", { name: "Edit" }),
      );

      const nameField = screen.getByLabelText(/^Name/);
      expect(nameField).toHaveValue("Kavya Iyer");
      expect(screen.getByLabelText(/^Email/)).toHaveValue("kavya@acme.example");

      await userEvent.clear(nameField);
      await userEvent.type(nameField, "Kavya I.");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => expect(findCallByMethod("PATCH")).toBeDefined());
      const [url, init] = findCallByMethod("PATCH")!;
      expect(url).toBe("/api/proxy/users/user-1");
      expect(JSON.parse((init as RequestInit).body as string)).toEqual({
        name: "Kavya I.",
        email: "kavya@acme.example",
        status: "active",
      });
    });

    it("displays the specific API error message in toast if PATCH fails", async () => {
      fetchMock.mockImplementation((_url, init) => {
        if ((init as RequestInit | undefined)?.method === "PATCH") {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                code: "E_422_VALIDATION_FAILED",
                message: "Validation failed",
                data: {
                  errors: [
                    {
                      field: "name",
                      issue: "Name must follow the valid format",
                    },
                  ],
                },
              }),
              { status: 422, headers: { "content-type": "application/json" } },
            ),
          );
        }
        return Promise.resolve(makeUsersResponse());
      });

      renderPage();
      await userEvent.click(
        await screen.findByRole("button", { name: "Edit" }),
      );

      const nameField = await screen.findByLabelText(/^Name/);
      await userEvent.clear(nameField);
      await userEvent.type(nameField, "Invalid123");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(
        await screen.findByText("Name must follow the valid format"),
      ).toBeInTheDocument();
    });
  });

  describe("deleting a user", () => {
    it("confirms, then DELETEs the row", async () => {
      renderPage();
      await userEvent.click(
        await screen.findByRole("button", { name: "Delete" }),
      );
      expect(screen.getByText("Delete this user?")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

      await waitFor(() => expect(findCallByMethod("DELETE")).toBeDefined());
      const [url] = findCallByMethod("DELETE")!;
      expect(url).toBe("/api/proxy/users/user-1");
    });
  });
});
