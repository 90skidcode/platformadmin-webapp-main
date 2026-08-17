import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

function renderTooltip() {
  render(
    <TooltipProvider>
      {/* disableHoverableContent: Radix's default "hoverable content" grace
          area tracks real pointer-movement geometry to let the cursor travel
          from trigger to content without closing -- jsdom has no layout, so
          that geometry never resolves and the close-on-unhover assertion
          below would hang. Off here; the real app keeps the default. */}
      <Tooltip delayDuration={0} disableHoverableContent>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Environment: Staging</TooltipContent>
      </Tooltip>
    </TooltipProvider>,
  );
}

describe("Tooltip", () => {
  it("is hidden until the trigger is hovered", () => {
    renderTooltip();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows its content on hover", async () => {
    renderTooltip();
    await userEvent.hover(screen.getByText("Hover me"));
    await waitFor(() =>
      expect(screen.getByRole("tooltip")).toHaveTextContent(
        "Environment: Staging",
      ),
    );
  });

  it("hides again on unhover", async () => {
    renderTooltip();
    const trigger = screen.getByText("Hover me");
    await userEvent.hover(trigger);
    await waitFor(() =>
      expect(screen.getByRole("tooltip")).toBeInTheDocument(),
    );
    await userEvent.unhover(trigger);
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
    );
  });
});
