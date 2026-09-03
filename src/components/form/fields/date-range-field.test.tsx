import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi, type Mock } from "vitest";

import { DateRangeField } from "./date-range-field";
import type { FieldHandlers, FormField } from "../types";

function TestFormWrapper({
  field,
  fieldHandlers,
  onFieldEvent,
  externalState,
  setFieldState,
}: {
  field: FormField;
  fieldHandlers?: FieldHandlers;
  onFieldEvent?: (field: string, type: string, detail?: string) => void;
  externalState?: { disabled?: boolean; error?: string; hidden?: boolean };
  setFieldState?: Mock;
}) {
  const form = useForm({
    defaultValues: {
      [field.name]: field.defaultValue ?? { from: null, to: null },
    },
  });

  return (
    <DateRangeField
      field={field}
      form={form}
      translate={(key) => key}
      apiFetcher={vi.fn() as never}
      onFieldEvent={onFieldEvent}
      fieldHandlers={fieldHandlers}
      externalState={externalState}
      setFieldState={setFieldState}
    />
  );
}

describe("DateRangeField", () => {
  it("renders with label and placeholder", () => {
    const field: FormField = {
      name: "bookingRange",
      type: "date-range",
      label: "Booking Range",
      placeholder: "Select booking range",
    };

    render(<TestFormWrapper field={field} />);
    expect(screen.getByText("Booking Range")).toBeInTheDocument();
    expect(screen.getByText("Select booking range")).toBeInTheDocument();
  });

  it("calls onValueChange handler and emits field event when range is selected", async () => {
    const user = userEvent.setup();
    const handleValueChange = vi.fn();
    const handleFieldEvent = vi.fn();
    const setFieldState = vi.fn();

    const field: FormField = {
      name: "vacationPeriod",
      type: "date-range",
      label: "Vacation Period",
      onValueChange: "validateDateRangeDependency",
      minDate: "2026-08-01",
    };

    render(
      <TestFormWrapper
        field={field}
        fieldHandlers={{ validateDateRangeDependency: handleValueChange }}
        onFieldEvent={handleFieldEvent}
        setFieldState={setFieldState}
      />,
    );

    const trigger = screen.getByRole("button", { name: /vacationperiod/i });
    await user.click(trigger);

    const day10 = screen.getByRole("button", { name: /Aug 10 2026/i });
    const day20 = screen.getByRole("button", { name: /Aug 20 2026/i });

    await user.click(day10);
    await user.click(day20);

    expect(handleFieldEvent).toHaveBeenCalledWith(
      "vacationPeriod",
      "onValueChange",
      "2026-08-10:2026-08-20",
    );
    expect(handleValueChange).toHaveBeenCalledWith(
      "2026-08-10:2026-08-20",
      expect.objectContaining({ setFieldState }),
    );
  });

  it("displays external dependency error on date range field", () => {
    const field: FormField = {
      name: "bookingRange",
      type: "date-range",
      label: "Booking Range",
    };

    render(
      <TestFormWrapper
        field={field}
        externalState={{ error: "Date range overlaps with another booking" }}
      />,
    );

    expect(
      screen.getByText("Date range overlaps with another booking"),
    ).toBeInTheDocument();
  });
});
