import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EnvironmentProvider, useEnvironment } from "./environment-provider";

function Consumer() {
  const { active, environments, setActive } = useEnvironment();
  return (
    <div>
      <span data-testid="active">{active.id}</span>
      {environments.map((e) => (
        <button key={e.id} onClick={() => setActive(e.id)}>
          {e.id}
        </button>
      ))}
    </div>
  );
}

afterEach(() => {
  document.cookie =
    "admin-environment=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
});

describe("EnvironmentProvider", () => {
  it("defaults to the first environment when no cookie is set", () => {
    render(
      <EnvironmentProvider>
        <Consumer />
      </EnvironmentProvider>,
    );
    expect(screen.getByTestId("active")).toHaveTextContent("dev");
  });

  it("switching updates what a consumer reads and persists it to a cookie", async () => {
    render(
      <EnvironmentProvider>
        <Consumer />
      </EnvironmentProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "staging" }));
    expect(screen.getByTestId("active")).toHaveTextContent("staging");
    expect(document.cookie).toContain("admin-environment=staging");
  });

  it("picks up a pre-existing cookie value on mount", async () => {
    document.cookie = "admin-environment=production; path=/";
    render(
      <EnvironmentProvider>
        <Consumer />
      </EnvironmentProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("active")).toHaveTextContent("production"),
    );
  });

  it("throws when useEnvironment is used outside the provider", () => {
    function Bare() {
      useEnvironment();
      return null;
    }
    expect(() => render(<Bare />)).toThrow(/EnvironmentProvider/);
  });
});
