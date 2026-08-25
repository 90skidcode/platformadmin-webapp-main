import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TenantProvider } from "@/lib/tenant";
import { renderWithProviders } from "@/test/test-utils";
import { buildSession } from "@/test/session-factory";
import { TenantSwitcher } from "./tenant-switcher";

const messages = { common: { topbar: { tenant: "Tenant" } } };

function renderSwitcher(tenants: { id: string; name: string }[]) {
  renderWithProviders(<TenantSwitcher />, {
    messages,
    session: buildSession({ tenants }),
    wrap: (children) => <TenantProvider>{children}</TenantProvider>,
  });
}

describe("TenantSwitcher", () => {
  describe("with a single-tenant session", () => {
    it("renders nothing", () => {
      renderSwitcher([{ id: "acme", name: "Acme Corp" }]);
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
  });

  describe("with a multi-tenant session", () => {
    it("lists every tenant, sourced from the session", async () => {
      renderSwitcher([
        { id: "acme", name: "Acme Corp" },
        { id: "globex", name: "Globex Inc" },
      ]);
      expect(await screen.findByText("Acme Corp")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("combobox", { name: "Tenant" }));
      expect(
        screen.getByRole("option", { name: "Globex Inc" }),
      ).toBeInTheDocument();
    });
  });
});
