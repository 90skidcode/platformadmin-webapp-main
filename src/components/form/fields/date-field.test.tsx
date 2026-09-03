import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi, type Mock } from "vitest";

import { DateField } from "./date-field";
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
      [field.name]: field.defaultValue ?? "",
    },
  });

  return (
    <DateField
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

describe("DateField", () => {
  it("renders with label and placeholder", () => {
    const field: FormField = {
      name: "startDate",
      type: "date",
      label: "Start Date",
      placeholder: "Pick a start date",
    };

    render(<TestFormWrapper field={field} />);
    expect(screen.getByText("Start Date")).toBeInTheDocument();
    expect(screen.getByText("Pick a start date")).toBeInTheDocument();
  });

  it("calls onValueChange handler and emits field event on date selection", async () => {
    const user = userEvent.setup();
    const handleValueChange = vi.fn();
    const handleFieldEvent = vi.fn();
    const setFieldState = vi.fn();

    const field: FormField = {
      name: "appointmentDate",
      type: "date",
      label: "Appointment Date",
      defaultValue: "2026-09-10",
      onValueChange: "checkDateAvailability",
    };

    render(
      <TestFormWrapper
        field={field}
        fieldHandlers={{ checkDateAvailability: handleValueChange }}
        onFieldEvent={handleFieldEvent}
        setFieldState={setFieldState}
      />,
    );

    const trigger = screen.getByRole("button", { name: /appointmentdate/i });
    await user.click(trigger);

    const day15 = screen.getByRole("button", { name: /Tue Sep 15 2026/i });
    await user.click(day15);

    expect(handleFieldEvent).toHaveBeenCalledWith(
      "appointmentDate",
      "onValueChange",
      "2026-09-15",
    );
    expect(handleValueChange).toHaveBeenCalledWith(
      "2026-09-15",
      expect.objectContaining({ setFieldState }),
    );
  });

  it("displays external dependency error when provided", () => {
    const field: FormField = {
      name: "startDate",
      type: "date",
      label: "Start Date",
    };

    render(
      <TestFormWrapper
        field={field}
        externalState={{ error: "Date conflict with another field" }}
      />,
    );

    expect(
      screen.getByText("Date conflict with another field"),
    ).toBeInTheDocument();
  });
});
