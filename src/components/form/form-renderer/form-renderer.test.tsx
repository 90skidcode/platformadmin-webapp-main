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

  describe("conditional fields", () => {
    const conditionalSchema: FormSchema = {
      id: "user-profile-form",
      layout: { columns: 2 },
      fields: [
        {
          name: "name",
          type: "text",
          label: "Full name",
          validation: { required: true, minLength: 3 },
        },
        {
          name: "surname",
          type: "text",
          label: "Surname",
          showIf: {
            field: "name",
            condition: "valid",
          },
        },
        {
          name: "bio",
          type: "textarea",
          label: "Biography",
          disabledIf: {
            field: "name",
            condition: "invalid",
          },
        },
        {
          name: "code",
          type: "text",
          label: "Security Code",
          validation: { pattern: "^[A-Z]{3}$" },
        },
        {
          name: "codeHint",
          type: "text",
          label: "Code Hint",
          showIf: {
            field: "code",
            condition: "invalid",
          },
        },
        {
          name: "adminNotes",
          type: "text",
          label: "Admin Notes",
          disabledIf: {
            field: "code",
            condition: "valid",
          },
        },
      ],
      actions: [
        {
          id: "submit",
          type: "submit",
          label: "Save",
          endpoint: { method: "POST", url: "/profile" },
        },
        {
          id: "setErrorBtn",
          type: "button",
          label: "Set Error",
          onClick: "triggerError",
        },
      ],
    };

    it("shows a field when the name is valid and hides it when the name is empty", async () => {
      renderForm(conditionalSchema);
      expect(screen.queryByLabelText("Surname")).not.toBeInTheDocument();

      await userEvent.type(screen.getByLabelText(/Full name/), "Ab");
      expect(screen.queryByLabelText("Surname")).not.toBeInTheDocument();

      await userEvent.type(screen.getByLabelText(/Full name/), "c");
      expect(screen.getByLabelText("Surname")).toBeInTheDocument();

      await userEvent.clear(screen.getByLabelText(/Full name/));
      expect(screen.queryByLabelText("Surname")).not.toBeInTheDocument();
    });

    it("disables the biography until a valid name is entered", async () => {
      renderForm(conditionalSchema);
      const bioInput = screen.getByLabelText("Biography");
      expect(bioInput).toBeDisabled();

      await userEvent.type(screen.getByLabelText(/Full name/), "Kavya");
      expect(bioInput).not.toBeDisabled();

      await userEvent.clear(screen.getByLabelText(/Full name/));
      expect(bioInput).toBeDisabled();
    });

    it("shows the code hint for an invalid code and disables admin notes for a valid code", async () => {
      renderForm(conditionalSchema);
      await userEvent.type(screen.getByLabelText("Security Code"), "12");
      expect(screen.getByLabelText("Code Hint")).toBeInTheDocument();
      expect(screen.getByLabelText("Admin Notes")).not.toBeDisabled();

      await userEvent.clear(screen.getByLabelText("Security Code"));
      await userEvent.type(screen.getByLabelText("Security Code"), "ABC");

      expect(screen.queryByLabelText("Code Hint")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Admin Notes")).toBeDisabled();
    });

    it("updates related fields when an error is added to the name", async () => {
      const triggerError = vi.fn((_values, { formApi }) => {
        formApi.setError("name", {
          type: "server",
          message: "Name already taken",
        });
      });

      renderForm(conditionalSchema, { triggerError });

      await userEvent.type(screen.getByLabelText(/Full name/), "Priya");
      expect(screen.getByLabelText("Surname")).toBeInTheDocument();
      expect(screen.getByLabelText("Biography")).not.toBeDisabled();

      await userEvent.click(screen.getByRole("button", { name: "Set Error" }));

      expect(screen.queryByLabelText("Surname")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Biography")).toBeDisabled();
    });

    it("clears a hidden field's error and validates it again when it is shown", async () => {
      const commentSchema: FormSchema = {
        id: "comment-form",
        fields: [
          {
            name: "name",
            type: "text",
            label: "Name",
            validation: { required: true },
          },
          {
            name: "comments",
            type: "text",
            label: "Comments",
            showIf: {
              field: "name",
              condition: "valid",
            },
            validation: {
              required: true,
              minLength: 5,
              messages: { minLength: "Minimum 5 characters required" },
            },
          },
        ],
        actions: [
          {
            id: "submit",
            type: "submit",
            label: "Submit",
            endpoint: { method: "POST", url: "/comments" },
          },
        ],
      };

      const apiFetcher = renderForm(commentSchema);

      // 1. Dependency is valid -> conditional field is visible
      await userEvent.type(screen.getByLabelText(/Name/), "Alice");
      const commentsInput = screen.getByLabelText(/Comments/);
      expect(commentsInput).toBeInTheDocument();

      // 2. Enter an invalid value into the conditional field
      await userEvent.type(commentsInput, "Hi");

      // 3. Trigger validation -> error is displayed
      await userEvent.click(screen.getByRole("button", { name: "Submit" }));
      expect(
        await screen.findByText("Minimum 5 characters required"),
      ).toBeInTheDocument();

      // 4. Make the dependency invalid -> conditional field becomes hidden
      await userEvent.clear(screen.getByLabelText(/Name/));
      expect(screen.queryByLabelText(/Comments/)).not.toBeInTheDocument();

      // 5. Verify clearErrors(field.name) removes the conditional field's error
      expect(
        screen.queryByText("Minimum 5 characters required"),
      ).not.toBeInTheDocument();

      // 6. Make the dependency valid again -> conditional field becomes visible and retains value
      await userEvent.type(screen.getByLabelText(/Name/), "Alice");
      const restoredCommentsInput = screen.getByLabelText(/Comments/);
      expect(restoredCommentsInput).toBeInTheDocument();
      expect(restoredCommentsInput).toHaveValue("Hi");

      // 7. Verify the previous error is NOT immediately displayed when the field becomes visible again
      expect(
        screen.queryByText("Minimum 5 characters required"),
      ).not.toBeInTheDocument();

      // 8. Verify that submittal with the invalid value displays the new error
      await userEvent.click(screen.getByRole("button", { name: "Submit" }));
      expect(
        await screen.findByText("Minimum 5 characters required"),
      ).toBeInTheDocument();
      expect(apiFetcher).not.toHaveBeenCalled();

      // 9. When updated to a valid value, submitting passes successfully
      await userEvent.type(restoredCommentsInput, " there");
      await userEvent.click(screen.getByRole("button", { name: "Submit" }));
      await waitFor(() =>
        expect(apiFetcher).toHaveBeenCalledWith(
          "/comments",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ name: "Alice", comments: "Hi there" }),
          }),
        ),
      );
    });
  });
});
