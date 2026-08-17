import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

import { schemaToZod } from "../schema-to-zod";
import type { ActionHandlers, FormSchema } from "../types";
import { FormActions } from "./form-actions";

const session = {
  user: {
    id: "user-1",
    name: "Priya",
    email: "admin@platform.local",
    roles: ["platform-admin"],
    permissions: ["employees.write"],
    tenants: [],
  },
  accessToken: "token",
  expires: "2099-01-01T00:00:00.000Z",
} as Session;

function Harness({
  schema,
  actionHandlers,
  apiFetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
  onRefetch,
}: {
  schema: FormSchema;
  actionHandlers: ActionHandlers;
  apiFetcher?: ReturnType<typeof vi.fn>;
  onRefetch?: () => void;
}) {
  const form = useForm({ resolver: zodResolver(schemaToZod(schema.fields)) });
  return (
    <SessionProvider session={session}>
      <FormActions
        schema={schema}
        form={form}
        actionHandlers={actionHandlers}
        apiFetcher={apiFetcher as never}
        translate={(key) => key}
        onRefetch={onRefetch}
      />
    </SessionProvider>
  );
}

const requiredFieldSchema: FormSchema = {
  id: "test-form",
  fields: [{ name: "email", type: "email", validation: { required: true } }],
  actions: [],
};

describe("FormActions", () => {
  it("a 'button' action's onClick fires immediately, without RHF validation, even with an invalid form", async () => {
    const onClick = vi.fn();
    render(
      <Harness
        schema={{
          ...requiredFieldSchema,
          actions: [
            {
              id: "preview",
              type: "button",
              label: "Preview",
              onClick: "preview",
            },
          ],
        }}
        actionHandlers={{ preview: onClick }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("a 'submit' action with onClick still validates first, then calls the handler instead of hitting endpoint", async () => {
    const onClick = vi.fn();
    const apiFetcher = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    render(
      <Harness
        schema={{
          ...requiredFieldSchema,
          actions: [
            {
              id: "submit",
              type: "submit",
              label: "Save",
              onClick: "customSubmit",
              endpoint: { method: "POST", url: "/employees" },
            },
          ],
        }}
        actionHandlers={{ customSubmit: onClick }}
        apiFetcher={apiFetcher}
      />,
    );

    // invalid (required email missing) -> handler must NOT fire
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).not.toHaveBeenCalled();
    expect(apiFetcher).not.toHaveBeenCalled();
  });

  it("a plain 'submit' action (no onClick) POSTs to endpoint via the apiFetcher", async () => {
    const apiFetcher = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    render(
      <Harness
        schema={{
          id: "test-form",
          fields: [
            {
              name: "email",
              type: "email",
              defaultValue: "kavya@acme.example",
            },
          ],
          actions: [
            {
              id: "submit",
              type: "submit",
              label: "Save",
              endpoint: { method: "POST", url: "/employees" },
            },
          ],
        }}
        actionHandlers={{}}
        apiFetcher={apiFetcher}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(apiFetcher).toHaveBeenCalledWith(
        "/employees",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("hides an action whose permission the session lacks", () => {
    render(
      <Harness
        schema={{
          ...requiredFieldSchema,
          actions: [
            {
              id: "delete",
              type: "button",
              label: "Delete",
              onClick: "del",
              permission: "employees.delete",
            },
          ],
        }}
        actionHandlers={{ del: vi.fn() }}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });

  it("shows an action whose permission the session has", () => {
    render(
      <Harness
        schema={{
          ...requiredFieldSchema,
          actions: [
            {
              id: "save",
              type: "button",
              label: "Save",
              onClick: "save",
              permission: "employees.write",
            },
          ],
        }}
        actionHandlers={{ save: vi.fn() }}
      />,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("reset calls form.reset() and then the optional onClick", async () => {
    const onClick = vi.fn();
    render(
      <Harness
        schema={{
          ...requiredFieldSchema,
          actions: [
            {
              id: "cancel",
              type: "reset",
              label: "Cancel",
              onClick: "afterReset",
            },
          ],
        }}
        actionHandlers={{ afterReset: onClick }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("onSuccess.refetch calls the onRefetch prop -- e.g. a form in a dialog refreshing the table beside it", async () => {
    const onRefetch = vi.fn();
    render(
      <Harness
        schema={{
          ...requiredFieldSchema,
          actions: [
            {
              id: "save",
              type: "button",
              label: "Save",
              onClick: "save",
              onSuccess: { refetch: true },
            },
          ],
        }}
        actionHandlers={{ save: vi.fn() }}
        onRefetch={onRefetch}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onRefetch).toHaveBeenCalledOnce();
  });
});
