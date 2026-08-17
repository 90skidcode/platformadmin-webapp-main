import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";

import commonMessages from "@/messages/en/common.json";
import formsMessages from "@/messages/en/forms.json";
import { renderWithProviders } from "@/test/test-utils";
import { buildSession } from "@/test/session-factory";
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
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "S_200_SETTINGS_FETCH_OK",
          message: "Settings fetched successfully",
          data: settings,
        }),
        { status: 200 },
      ),
    ),
  );
  renderWithProviders(<SettingsPage />, {
    messages: { common: commonMessages, forms: formsMessages },
    session: buildSession({
      name: "Priya",
      roles: ["platform-admin"],
      permissions,
    }),
  });
}

describe("SettingsPage", () => {
  describe("while settings are loading", () => {
    it("shows a loading state", () => {
      renderPage();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("once settings have loaded", () => {
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
});
