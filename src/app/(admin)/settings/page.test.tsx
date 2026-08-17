import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

import commonMessages from "@/messages/en/common.json";
import formsMessages from "@/messages/en/forms.json";
import SettingsPage from "./page";

const settings = {
  orgName: "Acme Corp",
  defaultEnvironment: "staging",
  sessionTimeoutMinutes: 60,
  notifyOnLogin: true,
  notifyOnRoleChange: true,
};

function renderPage(
  permissions: string[] = ["settings.read", "settings.write"],
) {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(settings), { status: 200 }),
      ),
  );
  const session = {
    user: {
      id: "u1",
      name: "Priya",
      roles: ["platform-admin"],
      permissions,
      tenants: [],
    },
    accessToken: "t",
    expires: "2099-01-01T00:00:00.000Z",
  } as Session;
  render(
    <NextIntlClientProvider
      locale="en"
      messages={{ common: commonMessages, forms: formsMessages }}
    >
      <SessionProvider session={session}>
        <SettingsPage />
      </SessionProvider>
    </NextIntlClientProvider>,
  );
}

describe("SettingsPage", () => {
  it("shows a loading state before settings arrive", () => {
    renderPage();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders the form pre-filled with the fetched settings", async () => {
    renderPage();
    expect(await screen.findByDisplayValue("Acme Corp")).toBeInTheDocument();
  });

  it("hides the save button for a session with settings.read but not settings.write", async () => {
    renderPage(["settings.read"]);
    await screen.findByDisplayValue("Acme Corp");
    expect(
      screen.queryByRole("button", { name: "Save settings" }),
    ).not.toBeInTheDocument();
  });

  it("shows the save button for a session with settings.write", async () => {
    renderPage(["settings.read", "settings.write"]);
    expect(
      await screen.findByRole("button", { name: "Save settings" }),
    ).toBeInTheDocument();
  });
});
