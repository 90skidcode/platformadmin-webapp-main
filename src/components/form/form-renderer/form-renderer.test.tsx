import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { buildSession } from "@/test/session-factory";
import type { ActionHandlers, FormSchema } from "../types";
import type { FieldEventHandlers } from "../field-events";
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
  fieldEventHandlers: FieldEventHandlers = {},
) {
  renderWithProviders(
    <FormRenderer
      schema={schema}
      actionHandlers={actionHandlers}
      fieldEventHandlers={fieldEventHandlers}
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

const twoFieldSchema: FormSchema = {
  id: "event-form",
  fields: [
    {
      name: "firstName",
      type: "text",
      label: "First Name",
      events: {
        onChange: "handleFirstNameChange",
        onBlur: "handleFirstNameBlur",
      },
    },
    {
      name: "lastName",
      type: "text",
      label: "Last Name",
    },
  ],
  actions: [
    {
      id: "submit",
      type: "submit",
      label: "Submit",
      endpoint: { method: "POST", url: "/submit" },
    },
  ],
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const populateLastName = (
  values: Record<string, unknown>,
  {
    formApi,
  }: {
    formApi: { setValue: (name: string, value: unknown) => void };
  },
) => {
  if (values.firstName === "John") {
    formApi.setValue("lastName", "Doe");
  }
};

const toggleLastNameError = (
  values: Record<string, unknown>,
  {
    formApi,
  }: {
    formApi: {
      setError: (
        name: string,
        error: { type: string; message: string },
      ) => void;
      clearErrors: (name?: string) => void;
    };
  },
) => {
  if (values.firstName === "Invalid") {
    formApi.setError("lastName", {
      type: "manual",
      message: "Last name is required when First name is Invalid",
    });
  } else if (values.firstName === "Valid") {
    formApi.clearErrors("lastName");
  }
};

const asyncPopulateLastName = async (
  values: Record<string, unknown>,
  {
    formApi,
  }: {
    formApi: { setValue: (name: string, value: unknown) => void };
  },
) => {
  await delay(10);
  if (values.firstName === "Async") {
    formApi.setValue("lastName", "AsyncResult");
  }
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

describe("FormRenderer - field event handlers", () => {
  describe("when a field does not have configured event actions", () => {
    it("should allow the user to enter input and submit the form normally", async () => {
      const apiFetcher = vi
        .fn()
        .mockResolvedValue(new Response("{}", { status: 200 }));
      renderForm(employeeSchema, {}, apiFetcher);
      const input = screen.getByLabelText(/Full name/);
      await userEvent.type(input, "Jane Doe");
      expect(input).toHaveValue("Jane Doe");
      await userEvent.click(screen.getByRole("button", { name: "Create" }));
      await waitFor(() =>
        expect(apiFetcher).toHaveBeenCalledWith(
          "/employees",
          expect.objectContaining({
            body: JSON.stringify({ name: "Jane Doe" }),
          }),
        ),
      );
    });

    it("should allow all standard field types to accept values and submit without errors", async () => {
      const multiTypeSchema: FormSchema = {
        id: "multi-field-form",
        fields: [
          { name: "bio", type: "textarea", label: "Bio" },
          { name: "agree", type: "checkbox", label: "I Agree" },
          { name: "notifications", type: "switch", label: "Notifications" },
          { name: "token", type: "hidden", defaultValue: "secret-123" },
        ],
        actions: [
          {
            id: "submit",
            type: "submit",
            label: "Save",
            endpoint: { method: "POST", url: "/save" },
          },
        ],
      };

      const apiFetcher = vi
        .fn()
        .mockResolvedValue(new Response("{}", { status: 200 }));
      renderForm(multiTypeSchema, {}, apiFetcher);

      const textarea = screen.getByLabelText(/Bio/);
      await userEvent.type(textarea, "My bio notes");
      expect(textarea).toHaveValue("My bio notes");

      const checkbox = screen.getByLabelText(/I Agree/);
      await userEvent.click(checkbox);

      const switchToggle = screen.getByLabelText(/Notifications/);
      await userEvent.click(switchToggle);

      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() =>
        expect(apiFetcher).toHaveBeenCalledWith(
          "/save",
          expect.objectContaining({
            body: JSON.stringify({
              bio: "My bio notes",
              agree: true,
              notifications: true,
              token: "secret-123",
            }),
          }),
        ),
      );
    });
  });

  describe("when the user changes a field value", () => {
    it("should execute the configured action with the latest entered values", async () => {
      const onChangeHandler = vi.fn();
      renderForm(twoFieldSchema, {}, vi.fn(), {
        handleFirstNameChange: onChangeHandler,
      });

      const input = screen.getByLabelText(/First Name/);
      await userEvent.type(input, "John");

      expect(input).toHaveValue("John");
      expect(onChangeHandler).toHaveBeenCalled();
      const [values, context] = onChangeHandler.mock.calls.at(-1)!;
      expect(values.firstName).toBe("John");
      expect(context.field.name).toBe("firstName");
      expect(context.formApi).toBeDefined();
    });

    it("should allow the action to automatically populate a value in another field", async () => {
      renderForm(twoFieldSchema, {}, vi.fn(), {
        handleFirstNameChange: populateLastName,
      });

      const firstNameInput = screen.getByLabelText(/First Name/);
      const lastNameInput = screen.getByLabelText(/Last Name/);

      await userEvent.type(firstNameInput, "John");
      expect(lastNameInput).toHaveValue("Doe");
    });

    it("should allow the action to display or clear an error message on another field", async () => {
      renderForm(twoFieldSchema, {}, vi.fn(), {
        handleFirstNameChange: toggleLastNameError,
      });

      const firstNameInput = screen.getByLabelText(/First Name/);

      await userEvent.type(firstNameInput, "Invalid");
      expect(
        await screen.findByText(
          "Last name is required when First name is Invalid",
        ),
      ).toBeInTheDocument();

      await userEvent.clear(firstNameInput);
      await userEvent.type(firstNameInput, "Valid");
      expect(
        screen.queryByText("Last name is required when First name is Invalid"),
      ).not.toBeInTheDocument();
    });

    it("should support asynchronous actions that update other fields", async () => {
      renderForm(twoFieldSchema, {}, vi.fn(), {
        handleFirstNameChange: asyncPopulateLastName,
      });

      const firstNameInput = screen.getByLabelText(/First Name/);
      const lastNameInput = screen.getByLabelText(/Last Name/);

      await userEvent.type(firstNameInput, "Async");
      await waitFor(() => expect(lastNameInput).toHaveValue("AsyncResult"));
    });

    it("should continue to validate fields and block submission when requirements are not met", async () => {
      const apiFetcher = vi.fn();
      const schemaWithValidation: FormSchema = {
        id: "validation-event-form",
        fields: [
          {
            name: "email",
            type: "email",
            label: "Email",
            validation: {
              required: true,
              messages: { email: "invalid email" },
            },
            events: { onChange: "emailChanged" },
          },
        ],
        actions: [
          {
            id: "submit",
            type: "submit",
            label: "Save",
            endpoint: { method: "POST", url: "/save" },
          },
        ],
      };

      const emailChanged = vi.fn();
      renderForm(schemaWithValidation, {}, apiFetcher, { emailChanged });

      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(await screen.findAllByRole("alert")).toHaveLength(1);
      expect(apiFetcher).not.toHaveBeenCalled();

      await userEvent.type(screen.getByLabelText(/Email/), "test@example.com");
      expect(emailChanged).toHaveBeenCalled();
    });
  });

  describe("when a field loses focus", () => {
    it("should execute the configured action with the updated field value", async () => {
      const onBlurHandler = vi.fn();
      renderForm(twoFieldSchema, {}, vi.fn(), {
        handleFirstNameBlur: onBlurHandler,
      });

      const input = screen.getByLabelText(/First Name/);
      await userEvent.click(input);
      await userEvent.type(input, "BlurTest");
      expect(onBlurHandler).not.toHaveBeenCalled();

      await userEvent.tab();
      expect(onBlurHandler).toHaveBeenCalled();
      const [values, context] = onBlurHandler.mock.calls[0];
      expect(values.firstName).toBe("BlurTest");
      expect(context.field.name).toBe("firstName");
    });
  });

  describe("when the user clicks on a field", () => {
    it("should execute the configured action when the field is clicked", async () => {
      const clickSpy = vi.fn();

      const clickSchema: FormSchema = {
        id: "click-events-form",
        fields: [
          {
            name: "title",
            type: "text",
            label: "Title",
            events: { onClick: "titleClicked" },
          },
          {
            name: "accepted",
            type: "checkbox",
            label: "Accept Terms",
            events: { onClick: "acceptedClicked" },
          },
          {
            name: "enableMode",
            type: "switch",
            label: "Enable Mode",
            events: { onClick: "switchClicked" },
          },
        ],
        actions: [],
      };

      renderForm(clickSchema, {}, vi.fn(), {
        titleClicked: clickSpy,
        acceptedClicked: clickSpy,
        switchClicked: clickSpy,
      });

      const titleInput = screen.getByLabelText(/Title/);
      await userEvent.click(titleInput);
      expect(clickSpy).toHaveBeenCalledTimes(1);

      const checkbox = screen.getByLabelText(/Accept Terms/);
      await userEvent.click(checkbox);
      expect(clickSpy).toHaveBeenCalledTimes(2);

      const switchToggle = screen.getByLabelText(/Enable Mode/);
      await userEvent.click(switchToggle);
      expect(clickSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe("when interacting with various field types", () => {
    it("should trigger configured change and blur actions for textareas, checkboxes, and switches", async () => {
      const changeSpy = vi.fn();
      const blurSpy = vi.fn();

      const richEventsSchema: FormSchema = {
        id: "rich-events-form",
        fields: [
          {
            name: "bio",
            type: "textarea",
            label: "Bio",
            events: { onChange: "bioChanged", onBlur: "bioBlurred" },
          },
          {
            name: "agree",
            type: "checkbox",
            label: "I Agree",
            events: { onChange: "agreeChanged", onBlur: "agreeBlurred" },
          },
          {
            name: "notifications",
            type: "switch",
            label: "Notifications",
            events: { onChange: "switchChanged", onBlur: "switchBlurred" },
          },
        ],
        actions: [],
      };

      renderForm(richEventsSchema, {}, vi.fn(), {
        bioChanged: changeSpy,
        bioBlurred: blurSpy,
        agreeChanged: changeSpy,
        agreeBlurred: blurSpy,
        switchChanged: changeSpy,
        switchBlurred: blurSpy,
      });

      const bioInput = screen.getByLabelText(/Bio/);
      await userEvent.type(bioInput, "Hello");
      expect(changeSpy).toHaveBeenCalledTimes(1);
      await userEvent.tab();
      expect(blurSpy).toHaveBeenCalledTimes(1);

      const agreeInput = screen.getByLabelText(/I Agree/);
      await userEvent.click(agreeInput);
      expect(changeSpy).toHaveBeenCalledTimes(2);
      await userEvent.tab();
      expect(blurSpy).toHaveBeenCalledTimes(2);

      const switchToggle = screen.getByLabelText(/Notifications/);
      await userEvent.click(switchToggle);
      expect(changeSpy).toHaveBeenCalledTimes(3);
      await userEvent.tab();
      expect(blurSpy).toHaveBeenCalledTimes(3);
    });
  });
});
