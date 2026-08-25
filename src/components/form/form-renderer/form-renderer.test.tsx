import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { buildSession } from "@/test/session-factory";
import type { ActionHandlers, FormSchema } from "../types";
import { FormRenderer } from "./form-renderer";

const session = buildSession({
  name: "Priya",
  email: "admin@platform.local",
  roles: ["platform-admin"],
});

function renderForm(
  schema: FormSchema,
  actionHandlers: ActionHandlers = {},
  apiFetcher = vi.fn(),
) {
  renderWithProviders(
    <FormRenderer
      schema={schema}
      actionHandlers={actionHandlers}
      apiFetcher={apiFetcher as never}
    />,
    { messages: {}, session },
  );
  return apiFetcher;
}

const employeeSchema: FormSchema = {
  id: "employee-form",
  layout: { columns: 2 },
  fields: [
    {
      name: "name",
      type: "text",
      label: "Full name",
      validation: { required: true },
    },
  ],
  actions: [
    {
      id: "submit",
      type: "submit",
      label: "Create",
      endpoint: { method: "POST", url: "/employees" },
    },
  ],
};

describe("FormRenderer", () => {
  describe("rendering fields", () => {
    it("renders fields from the schema", () => {
      renderForm(employeeSchema);
      expect(screen.getByLabelText(/Full name/)).toBeInTheDocument();
    });

    it("seeds fields from field.defaultValue merged with the defaultValues prop", () => {
      renderWithProviders(
        <FormRenderer
          schema={{
            ...employeeSchema,
            fields: [
              {
                name: "name",
                type: "text",
                label: "Full name",
                defaultValue: "Fallback",
              },
            ],
          }}
          defaultValues={{ name: "Kavya Iyer" }}
          apiFetcher={vi.fn() as never}
        />,
        { messages: {}, session },
      );
      expect(screen.getByLabelText("Full name")).toHaveValue("Kavya Iyer");
    });
  });

  describe("submitting", () => {
    it("shows a validation error and skips the POST when a required field is empty", async () => {
      const apiFetcher = renderForm(employeeSchema);
      await userEvent.click(screen.getByRole("button", { name: "Create" }));
      expect(await screen.findAllByRole("alert")).toHaveLength(1);
      expect(apiFetcher).not.toHaveBeenCalled();
    });

    it("POSTs to the endpoint once validation passes", async () => {
      const apiFetcher = vi
        .fn()
        .mockResolvedValue(new Response("{}", { status: 200 }));
      renderForm(employeeSchema, {}, apiFetcher);
      await userEvent.type(screen.getByLabelText(/Full name/), "Kavya Iyer");
      await userEvent.click(screen.getByRole("button", { name: "Create" }));
      await waitFor(() =>
        expect(apiFetcher).toHaveBeenCalledWith(
          "/employees",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ name: "Kavya Iyer" }),
          }),
        ),
      );
    });
  });

  describe("a 'button' action", () => {
    it("runs its onClick without validating the form first", async () => {
      const onClick = vi.fn();
      renderForm(
        {
          ...employeeSchema,
          actions: [
            {
              id: "preview",
              type: "button",
              label: "Preview",
              onClick: "preview",
            },
          ],
        },
        { preview: onClick },
      );
      await userEvent.click(screen.getByRole("button", { name: "Preview" }));
      expect(onClick).toHaveBeenCalledOnce();
    });
  });
});
