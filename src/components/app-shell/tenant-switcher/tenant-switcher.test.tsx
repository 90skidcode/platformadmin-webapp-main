import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

import { TenantProvider } from "@/lib/tenant";
import { TenantSwitcher } from "./tenant-switcher";

const messages = { common: { topbar: { tenant: "Tenant" } } };

function renderSwitcher(tenants: { id: string; name: string }[]) {
  const session = {
    user: { id: "u1", roles: [], permissions: [], tenants },
    accessToken: "t",
    expires: "2099-01-01T00:00:00.000Z",
  } as Session;
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SessionProvider session={session}>
        <TenantProvider>
          <TenantSwitcher />
        </TenantProvider>
      </SessionProvider>
    </NextIntlClientProvider>,
  );
}

describe("TenantSwitcher", () => {
  it("renders nothing for a single-tenant session", () => {
    renderSwitcher([{ id: "acme", name: "Acme Corp" }]);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("lists every tenant for a multi-tenant session, sourced from the session", async () => {
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
