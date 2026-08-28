import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import commonMessages from "@/messages/en/common.json";
import tablesMessages from "@/messages/en/tables.json";
import { renderWithProviders } from "@/test/test-utils";
import { buildSession } from "@/test/session-factory";
import { Toaster } from "@/components/toast";
import EditUserPage from "./page";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ id: "user-1" }),
}));

const mockUserPayload = {
  code: "S_200_USR_LIST_OK",
  message: "OK",
  data: {
    id: "user-1",
    name: "Kavya Iyer",
    email: "kavya@acme.example",
    status: "active",
  },
};

const fetchMock = vi.fn();

function renderEditPage() {
  vi.stubGlobal("fetch", fetchMock);
  renderWithProviders(
    <>
      <Toaster />
      <EditUserPage params={{ id: "user-1" }} />
    </>,
    {
      messages: { common: commonMessages, tables: tablesMessages },
      session: buildSession({ roles: ["platform-admin"] }),
    },
  );
}

describe("EditUserPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    fetchMock.mockReset();
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(mockUserPayload), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
  });

  it("fetches the user and pre-fills the form", async () => {
    renderEditPage();

    const nameField = await screen.findByLabelText(/^Name/);
    expect(nameField).toHaveValue("Kavya Iyer");
    expect(screen.getByLabelText(/^Email/)).toHaveValue("kavya@acme.example");
  });

  it("submitting PATCHes the updated user data and redirects to /users", async () => {
    renderEditPage();

    const nameField = await screen.findByLabelText(/^Name/);
    await userEvent.clear(nameField);
    await userEvent.type(nameField, "Kavya I.");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === "PATCH",
      );
      expect(patchCall).toBeDefined();
      const [url, init] = patchCall!;
      expect(url).toBe("/api/proxy/users/user-1");
      expect(JSON.parse((init as RequestInit).body as string)).toEqual({
        name: "Kavya I.",
        email: "kavya@acme.example",
        status: "active",
      });
    });

    expect(pushMock).toHaveBeenCalledWith("/users");
  });

  it("displays API error in toast if PATCH fails", async () => {
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
      return Promise.resolve(
        new Response(JSON.stringify(mockUserPayload), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    });

    renderEditPage();

    const nameField = await screen.findByLabelText(/^Name/);
    await userEvent.clear(nameField);
    await userEvent.type(nameField, "Invalid123");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Name must follow the valid format"),
    ).toBeInTheDocument();
  });
});
