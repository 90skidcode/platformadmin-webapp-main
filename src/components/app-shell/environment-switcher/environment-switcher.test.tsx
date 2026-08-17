import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";

import { EnvironmentProvider } from "@/lib/environment";
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
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <EnvironmentProvider>
        <EnvironmentSwitcher />
      </EnvironmentProvider>
    </NextIntlClientProvider>,
  );
}

describe("EnvironmentSwitcher", () => {
  it("shows the active environment's translated label", () => {
    renderSwitcher();
    expect(screen.getByText("Development")).toBeInTheDocument();
  });

  it("lists every environment when opened", async () => {
    renderSwitcher();
    await userEvent.click(
      screen.getByRole("combobox", { name: "Environment" }),
    );
    expect(screen.getByRole("option", { name: "Staging" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Production" }),
    ).toBeInTheDocument();
  });

  it("switching selection updates the displayed active environment", async () => {
    renderSwitcher();
    await userEvent.click(
      screen.getByRole("combobox", { name: "Environment" }),
    );
    await userEvent.click(screen.getByRole("option", { name: "Production" }));
    expect(screen.getByText("Production")).toBeInTheDocument();
  });
});
