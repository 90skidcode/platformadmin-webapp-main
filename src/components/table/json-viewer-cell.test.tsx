import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { JsonViewerCell } from "./json-viewer-cell";

const messages = {
  common: {
    table: {
      viewJson: "View JSON",
      jsonDetails: "Log Details",
      jsonDetailsDescription: "Full JSON payload and response attributes.",
      copyJson: "Copy JSON",
      jsonCopied: "Copied!",
      structuredView: "Structured Details",
      rawJsonView: "Raw JSON",
    },
  },
};

describe("JsonViewerCell", () => {
  const sampleRow = {
    id: "audit-123",
    action: "user.create",
    actor: "admin@example.com",
    meta: { status: "ok", code: 200 },
  };

  it("renders a View JSON button", () => {
    renderWithProviders(<JsonViewerCell row={sampleRow} />, { messages });

    expect(
      screen.getByRole("button", { name: "View JSON" }),
    ).toBeInTheDocument();
  });

  it("opens the drawer with structured details and raw JSON when clicked", async () => {
    renderWithProviders(<JsonViewerCell row={sampleRow} />, { messages });

    await userEvent.click(screen.getByRole("button", { name: "View JSON" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Log Details")).toBeInTheDocument();
    expect(screen.getByText("audit-123")).toBeInTheDocument();
    expect(screen.getByText("user.create")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
  });

  it("copies json to clipboard when Copy JSON is clicked", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    renderWithProviders(<JsonViewerCell row={sampleRow} />, { messages });

    await userEvent.click(screen.getByRole("button", { name: "View JSON" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy JSON" }));

    expect(writeTextMock).toHaveBeenCalledWith(
      JSON.stringify(sampleRow, null, 2),
    );
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });
});
