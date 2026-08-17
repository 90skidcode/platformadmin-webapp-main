import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

import { TenantProvider, useTenant } from "./tenant-provider";

const session = {
  user: {
    id: "u1",
    roles: ["platform-admin"],
    permissions: [],
    tenants: [
      { id: "acme", name: "Acme Corp" },
      { id: "globex", name: "Globex Inc" },
    ],
  },
  accessToken: "token",
  expires: "2099-01-01T00:00:00.000Z",
} as Session;

function Consumer() {
  const { active, tenants, setActive } = useTenant();
  return (
    <div>
      <span data-testid="active">{active?.id ?? "none"}</span>
      {tenants.map((t) => (
        <button key={t.id} onClick={() => setActive(t.id)}>
          {t.name}
        </button>
      ))}
    </div>
  );
}

function renderWithSession() {
  render(
    <SessionProvider session={session}>
      <TenantProvider>
        <Consumer />
      </TenantProvider>
    </SessionProvider>,
  );
}

afterEach(() => {
  document.cookie =
    "admin-tenant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
});

describe("TenantProvider", () => {
  it("sources the tenant list from the session and defaults to the first one", async () => {
    renderWithSession();
    await waitFor(() =>
      expect(screen.getByTestId("active")).toHaveTextContent("acme"),
    );
    expect(
      screen.getByRole("button", { name: "Acme Corp" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Globex Inc" }),
    ).toBeInTheDocument();
  });

  it("switching updates the active tenant and persists it to a cookie", async () => {
    renderWithSession();
    await waitFor(() =>
      expect(screen.getByTestId("active")).toHaveTextContent("acme"),
    );
    await userEvent.click(screen.getByRole("button", { name: "Globex Inc" }));
    expect(screen.getByTestId("active")).toHaveTextContent("globex");
    expect(document.cookie).toContain("admin-tenant=globex");
  });

  it("picks up a pre-existing cookie value on mount", async () => {
    document.cookie = "admin-tenant=globex; path=/";
    renderWithSession();
    await waitFor(() =>
      expect(screen.getByTestId("active")).toHaveTextContent("globex"),
    );
  });

  it("throws when useTenant is used outside the provider", () => {
    function Bare() {
      useTenant();
      return null;
    }
    expect(() => render(<Bare />)).toThrow(/TenantProvider/);
  });
});
