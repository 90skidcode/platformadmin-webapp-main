import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { buildSession } from "@/test/session-factory";
import { TenantProvider, useTenant } from "./tenant-provider";

const session = buildSession({
  roles: ["platform-admin"],
  tenants: [
    { id: "acme", name: "Acme Corp" },
    { id: "globex", name: "Globex Inc" },
  ],
});

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
  renderWithProviders(
    <TenantProvider>
      <Consumer />
    </TenantProvider>,
    { session },
  );
}

afterEach(() => {
  document.cookie =
    "admin-tenant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
});

describe("TenantProvider", () => {
  describe("on first mount", () => {
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

    it("picks up a pre-existing cookie value", async () => {
      document.cookie = "admin-tenant=globex; path=/";
      renderWithSession();
      await waitFor(() =>
        expect(screen.getByTestId("active")).toHaveTextContent("globex"),
      );
    });
  });

  describe("switching the active tenant", () => {
    it("updates the active tenant and persists it to a cookie", async () => {
      renderWithSession();
      await waitFor(() =>
        expect(screen.getByTestId("active")).toHaveTextContent("acme"),
      );
      await userEvent.click(screen.getByRole("button", { name: "Globex Inc" }));
      expect(screen.getByTestId("active")).toHaveTextContent("globex");
      expect(document.cookie).toContain("admin-tenant=globex");
    });
  });

  describe("used outside the provider", () => {
    it("throws", () => {
      function Bare() {
        useTenant();
        return null;
      }
      expect(() => render(<Bare />)).toThrow(/TenantProvider/);
    });
  });
});
