import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EnvironmentProvider } from "@/lib/environment";
import { renderWithProviders } from "@/test/test-utils";
import { EnvironmentSwitcher } from "./environment-switcher";

const messages = {
  common: {
    topbar: { environment: "Environment" },
    environments: {
      dev: "Development",
      staging: "Staging",
      production: "Production",
    },
  },
};

function renderSwitcher() {
  renderWithProviders(<EnvironmentSwitcher />, {
    messages,
    wrap: (children) => <EnvironmentProvider>{children}</EnvironmentProvider>,
  });
}

describe("EnvironmentSwitcher", () => {
  describe("on first render", () => {
    it("shows the active environment's translated label", () => {
      renderSwitcher();
      expect(screen.getByText("Development")).toBeInTheDocument();
    });
  });

  describe("opening it", () => {
    it("lists every environment", async () => {
      renderSwitcher();
      await userEvent.click(
        screen.getByRole("combobox", { name: "Environment" }),
      );
      expect(
        screen.getByRole("option", { name: "Staging" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Production" }),
      ).toBeInTheDocument();
    });
  });

  describe("switching the selection", () => {
    it("updates the displayed active environment", async () => {
      renderSwitcher();
      await userEvent.click(
        screen.getByRole("combobox", { name: "Environment" }),
      );
      await userEvent.click(screen.getByRole("option", { name: "Production" }));
      expect(screen.getByText("Production")).toBeInTheDocument();
    });
  });
});
