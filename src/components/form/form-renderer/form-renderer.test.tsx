import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

import type { ActionHandlers, FormSchema } from "../types";
import { FormRenderer } from "./form-renderer";

const session = {
  user: {
    id: "u1",
    name: "Priya",
    email: "admin@platform.local",
    roles: ["platform-admin"],
    permissions: [],
    tenants: [],
  },
  accessToken: "token",
  expires: "2099-01-01T00:00:00.000Z",
} as Session;

function renderForm(
  schema: FormSchema,
  actionHandlers: ActionHandlers = {},
  apiFetcher = vi.fn(),
) {
  render(
    <NextIntlClientProvider locale="en" messages={{}}>
      <SessionProvider session={session}>
        <FormRenderer
          schema={schema}
          actionHandlers={actionHandlers}
          apiFetcher={apiFetcher as never}
        />
      </SessionProvider>
    </NextIntlClientProvider>,
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
  it("renders fields from the schema", () => {
    renderForm(employeeSchema);
    expect(screen.getByLabelText(/Full name/)).toBeInTheDocument();
  });

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

  it("a 'button' action's onClick runs without validating the form first", async () => {
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

  it("seeds fields from field.defaultValue merged with the defaultValues prop", () => {
    render(
      <NextIntlClientProvider locale="en" messages={{}}>
        <SessionProvider session={session}>
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
          />
        </SessionProvider>
      </NextIntlClientProvider>,
    );
    expect(screen.getByLabelText("Full name")).toHaveValue("Kavya Iyer");
  });
});
