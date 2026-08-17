import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { renderWithProviders } from "@/test/test-utils";
import { buildSession } from "@/test/session-factory";
import { schemaToZod } from "../schema-to-zod";
import type { ActionHandlers, FormSchema } from "../types";
import { FormActions } from "./form-actions";

const session = buildSession({
  id: "user-1",
  name: "Priya",
  email: "admin@platform.local",
  roles: ["platform-admin"],
  permissions: ["employees.write"],
});

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
    <FormActions
      schema={schema}
      form={form}
      actionHandlers={actionHandlers}
      apiFetcher={apiFetcher as never}
      translate={(key) => key}
      onRefetch={onRefetch}
    />
  );
}

function renderHarness(props: Parameters<typeof Harness>[0]) {
  renderWithProviders(<Harness {...props} />, { session });
}

const requiredFieldSchema: FormSchema = {
  id: "test-form",
  fields: [{ name: "email", type: "email", validation: { required: true } }],
  actions: [],
};

describe("FormActions", () => {
  describe("a 'button' action", () => {
    it("fires onClick immediately, without RHF validation, even with an invalid form", async () => {
      const onClick = vi.fn();
      renderHarness({
        schema: {
          ...requiredFieldSchema,
          actions: [
            {
              id: "preview",
              type: "button",
              label: "Preview",
              onClick: "preview",
            },
          ],
        },
        actionHandlers: { preview: onClick },
      });

      await userEvent.click(screen.getByRole("button", { name: "Preview" }));

      expect(onClick).toHaveBeenCalledOnce();
    });
  });

  describe("a 'submit' action with an onClick", () => {
    it("still validates first, then calls the handler instead of hitting the endpoint", async () => {
      const onClick = vi.fn();
      const apiFetcher = vi
        .fn()
        .mockResolvedValue(new Response("{}", { status: 200 }));
      renderHarness({
        schema: {
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
        },
        actionHandlers: { customSubmit: onClick },
        apiFetcher,
      });

      // invalid (required email missing) -> handler must NOT fire
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(onClick).not.toHaveBeenCalled();
      expect(apiFetcher).not.toHaveBeenCalled();
    });
  });

  describe("a plain 'submit' action (no onClick)", () => {
    it("POSTs to the endpoint via the apiFetcher", async () => {
      const apiFetcher = vi
        .fn()
        .mockResolvedValue(new Response("{}", { status: 200 }));
      renderHarness({
        schema: {
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
        },
        actionHandlers: {},
        apiFetcher,
      });

      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() =>
        expect(apiFetcher).toHaveBeenCalledWith(
          "/employees",
          expect.objectContaining({ method: "POST" }),
        ),
      );
    });
  });

  describe("permission-gated actions", () => {
    it("hides an action whose permission the session lacks", () => {
      renderHarness({
        schema: {
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
        },
        actionHandlers: { del: vi.fn() },
      });
      expect(
        screen.queryByRole("button", { name: "Delete" }),
      ).not.toBeInTheDocument();
    });

    it("shows an action whose permission the session has", () => {
      renderHarness({
        schema: {
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
        },
        actionHandlers: { save: vi.fn() },
      });
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });
  });

  describe("a 'reset' action", () => {
    it("calls form.reset() and then the optional onClick", async () => {
      const onClick = vi.fn();
      renderHarness({
        schema: {
          ...requiredFieldSchema,
          actions: [
            {
              id: "cancel",
              type: "reset",
              label: "Cancel",
              onClick: "afterReset",
            },
          ],
        },
        actionHandlers: { afterReset: onClick },
      });
      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onClick).toHaveBeenCalledOnce();
    });
  });

  describe("onSuccess.refetch", () => {
    it("calls the onRefetch prop -- e.g. a form in a dialog refreshing the table beside it", async () => {
      const onRefetch = vi.fn();
      renderHarness({
        schema: {
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
        },
        actionHandlers: { save: vi.fn() },
        onRefetch,
      });
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(onRefetch).toHaveBeenCalledOnce();
    });
  });
});
