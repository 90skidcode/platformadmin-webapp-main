import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { DateRangePicker } from "./date-range-picker";

describe("DateRangePicker", () => {
  it("renders with default placeholder", () => {
    render(<DateRangePicker placeholder="Select range" />);
    expect(screen.getByText("Select range")).toBeInTheDocument();
  });

  it("renders with formatted value when provided", () => {
    render(
      <DateRangePicker value={{ from: "2026-08-01", to: "2026-08-15" }} />,
    );
    expect(screen.getByText("Aug 1, 2026 – Aug 15, 2026")).toBeInTheDocument();
  });

  it("opens the calendar popover on click and closes on escape", () => {
    render(<DateRangePicker numberOfMonths={1} />);
    const trigger = screen.getByRole("button", { name: "Select date range" });
    fireEvent.click(trigger);

    expect(
      screen.getByRole("dialog", { name: "Date Range Calendar" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("allows selecting a date range by clicking two dates", () => {
    const handleChange = vi.fn();
    render(
      <DateRangePicker
        numberOfMonths={1}
        minDate="2026-08-01"
        defaultValue={{ from: null, to: null }}
        onChange={handleChange}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Select date range" });
    fireEvent.click(trigger);

    const day10 = screen.getByRole("button", { name: /Aug 10 2026/i });
    const day20 = screen.getByRole("button", { name: /Aug 20 2026/i });

    fireEvent.click(day10);
    fireEvent.click(day20);

    expect(handleChange).toHaveBeenCalledWith({
      from: "2026-08-10",
      to: "2026-08-20",
    });
  });

  it("disables past dates when disablePast is true", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    render(<DateRangePicker disablePast numberOfMonths={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Select date range" }));

    const yesterdayBtn = screen.queryByRole("button", {
      name: new RegExp(yesterday.toDateString(), "i"),
    });

    if (yesterdayBtn) {
      expect(yesterdayBtn).toBeDisabled();
    }
  });

  it("disables future dates when disableFuture is true", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    render(<DateRangePicker disableFuture numberOfMonths={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Select date range" }));

    const tomorrowBtn = screen.queryByRole("button", {
      name: new RegExp(tomorrow.toDateString(), "i"),
    });

    if (tomorrowBtn) {
      expect(tomorrowBtn).toBeDisabled();
    }
  });

  it("hides past dates when hidePastDates is true", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    render(<DateRangePicker hidePastDates numberOfMonths={1} />);
    fireEvent.click(screen.getByRole("button", { name: "Select date range" }));

    const yesterdayBtn = screen.queryByRole("button", {
      name: new RegExp(yesterday.toDateString(), "i"),
    });

    expect(yesterdayBtn).toBeNull();
  });

  it("respects minDate and maxDate boundaries", () => {
    render(
      <DateRangePicker
        numberOfMonths={1}
        minDate="2026-08-10"
        maxDate="2026-08-20"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Select date range" }));

    const day5 = screen.getByRole("button", {
      name: /Aug 05 2026|Aug 5 2026/i,
    });
    const day25 = screen.getByRole("button", { name: /Aug 25 2026/i });

    expect(day5).toBeDisabled();
    expect(day25).toBeDisabled();
  });

  it("respects isDateDisabled custom predicate", () => {
    render(
      <DateRangePicker
        numberOfMonths={1}
        minDate="2026-08-01"
        isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Select date range" }));

    const sat = screen.getByRole("button", {
      name: /Sat Aug 01 2026|Sat Aug 1 2026/i,
    });
    expect(sat).toBeDisabled();
  });

  it("applies preset range when preset button is clicked", () => {
    const handleChange = vi.fn();
    render(
      <DateRangePicker
        numberOfMonths={1}
        onChange={handleChange}
        showPresets
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select date range" }));

    const todayPreset = screen.getByRole("button", { name: "Today" });
    fireEvent.click(todayPreset);

    expect(handleChange).toHaveBeenCalled();
  });

  it("clears selection when clear button is clicked", () => {
    const handleChange = vi.fn();
    render(
      <DateRangePicker
        value={{ from: "2026-08-01", to: "2026-08-15" }}
        onChange={handleChange}
        showClear
      />,
    );

    const clearBtn = screen.getByRole("button", { name: "Clear date range" });
    fireEvent.click(clearBtn);

    expect(handleChange).toHaveBeenCalledWith({ from: null, to: null });
  });

  it("disables all dates prior to the selected fromDate when selecting toDate", () => {
    render(
      <DateRangePicker
        numberOfMonths={1}
        minDate="2026-08-01"
        defaultValue={{ from: null, to: null }}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Select date range" });
    fireEvent.click(trigger);

    // Select start date Aug 15, 2026
    const day15 = screen.getByRole("button", { name: /Aug 15 2026/i });
    fireEvent.click(day15);

    // Any date prior to Aug 15 (e.g. Aug 10) must now be disabled
    const day10 = screen.getByRole("button", { name: /Aug 10 2026/i });
    const day20 = screen.getByRole("button", { name: /Aug 20 2026/i });

    expect(day10).toBeDisabled();
    expect(day20).not.toBeDisabled();
  });

  it("shows previous month and current month when disableFuture is true and numberOfMonths is 2", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00.000Z"));

    render(<DateRangePicker disableFuture numberOfMonths={2} />);

    const trigger = screen.getByRole("button", { name: "Select date range" });
    fireEvent.click(trigger);

    expect(screen.getByText("August 2026")).toBeInTheDocument();
    expect(screen.getByText("September 2026")).toBeInTheDocument();
    expect(screen.queryByText("October 2026")).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
