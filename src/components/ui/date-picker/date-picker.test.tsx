import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DatePicker } from "./date-picker";

describe("DatePicker", () => {
  it("renders with default placeholder", () => {
    render(<DatePicker placeholder="Select date" />);
    expect(screen.getByText("Select date")).toBeInTheDocument();
  });

  it("renders with formatted value when provided", () => {
    render(<DatePicker value="2026-09-15" />);
    expect(screen.getByText("Sep 15, 2026")).toBeInTheDocument();
  });

  it("opens the calendar popover on click and closes on escape", async () => {
    const user = userEvent.setup();
    render(<DatePicker value="2026-09-15" />);

    const trigger = screen.getByRole("button", { name: /select date/i });
    await user.click(trigger);

    expect(
      screen.getByRole("dialog", { name: /date picker calendar/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("September 2026")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("allows selecting a date by clicking a day", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<DatePicker value="2026-09-01" onChange={handleChange} />);

    const trigger = screen.getByRole("button", { name: /select date/i });
    await user.click(trigger);

    const day15 = screen.getByRole("button", { name: /Tue Sep 15 2026/i });
    await user.click(day15);

    expect(handleChange).toHaveBeenCalledWith("2026-09-15");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("disables past dates when disablePast is true", async () => {
    const user = userEvent.setup();
    const prevDay = new Date(Date.now() - 86400000);

    render(<DatePicker disablePast />);
    await user.click(screen.getByRole("button", { name: /select date/i }));

    const btn = screen.queryByRole("button", {
      name: new RegExp(prevDay.toDateString(), "i"),
    });
    if (btn) expect(btn).toBeDisabled();
  });

  it("disables future dates when disableFuture is true", async () => {
    const user = userEvent.setup();
    const nextDay = new Date(Date.now() + 86400000);

    render(<DatePicker disableFuture />);
    await user.click(screen.getByRole("button", { name: /select date/i }));

    const btn = screen.queryByRole("button", {
      name: new RegExp(nextDay.toDateString(), "i"),
    });
    if (btn) expect(btn).toBeDisabled();
  });

  it("respects minDate and maxDate boundaries", async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        minDate="2026-09-10"
        maxDate="2026-09-20"
        value="2026-09-15"
      />,
    );

    const trigger = screen.getByRole("button", { name: /select date/i });
    await user.click(trigger);

    const day5 = screen.getByRole("button", { name: /Sat Sep 05 2026/i });
    const day15 = screen.getByRole("button", { name: /Tue Sep 15 2026/i });
    const day25 = screen.getByRole("button", { name: /Fri Sep 25 2026/i });

    expect(day5).toBeDisabled();
    expect(day15).not.toBeDisabled();
    expect(day25).toBeDisabled();
  });

  it("applies preset date when preset button is clicked", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<DatePicker onChange={handleChange} showPresets />);

    const trigger = screen.getByRole("button", { name: /select date/i });
    await user.click(trigger);

    const todayPreset = screen.getByRole("button", { name: /^today$/i });
    await user.click(todayPreset);

    expect(handleChange).toHaveBeenCalled();
  });

  it("clears selection when clear button is clicked", () => {
    const handleChange = vi.fn();
    render(<DatePicker value="2026-09-15" onChange={handleChange} showClear />);

    const clearButton = screen.getByRole("button", { name: /clear date/i });
    fireEvent.click(clearButton);

    expect(handleChange).toHaveBeenCalledWith(null);
  });
});
