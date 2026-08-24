import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { buildSession } from "@/test/session-factory";
import type { FormSchema } from "../types";
import { FormRenderer } from "../form-renderer/form-renderer";

const session = buildSession({
  name: "Priya",
  email: "admin@platform.local",
  roles: ["platform-admin"],
});

const multiSelectFormSchema: FormSchema = {
  id: "roles-form",
  fields: [
    {
      name: "roles",
      type: "multi-select",
      label: "User roles",
      placeholder: "Select user roles",
      validation: { required: true },
      optionsSource: {
        type: "static",
        options: [
          { value: "admin", label: "Administrator" },
          { value: "editor", label: "Editor" },
          { value: "viewer", label: "Viewer" },
        ],
      },
    },
  ],
  actions: [
    {
      id: "submit",
      type: "submit",
      label: "Save roles",
      endpoint: { method: "POST", url: "/api/roles" },
    },
  ],
};

function renderRolesForm(apiFetcher = vi.fn()) {
  renderWithProviders(
    <FormRenderer
      schema={multiSelectFormSchema}
      apiFetcher={apiFetcher as never}
    />,
    { messages: {}, session },
  );
  return apiFetcher;
}

describe("MultiSelectField", () => {
  describe("when the form field is displayed", () => {
    it("should display the field label and placeholder", () => {
      renderRolesForm();
      expect(screen.getByText("User roles")).toBeInTheDocument();
      expect(screen.getByText("Select user roles")).toBeInTheDocument();
    });
  });

  describe("when the form is submitted without selecting required options", () => {
    it("should display the required validation message and prevent submission", async () => {
      const user = userEvent.setup();
      const apiFetcher = renderRolesForm();

      await user.click(screen.getByRole("button", { name: "Save roles" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Required");
      expect(apiFetcher).not.toHaveBeenCalled();
    });
  });

  describe("when the user does not meet the minimum selection requirement", () => {
    it("should display the default minimum selection error message when no custom message is configured", async () => {
      const user = userEvent.setup();
      const apiFetcher = vi.fn();
      const minRolesSchema: FormSchema = {
        ...multiSelectFormSchema,
        fields: [
          {
            ...multiSelectFormSchema.fields[0],
            validation: {
              required: true,
              min: 2,
            },
          },
        ],
      };

      renderWithProviders(
        <FormRenderer
          schema={minRolesSchema}
          apiFetcher={apiFetcher as never}
        />,
        { messages: {}, session },
      );

      await user.click(screen.getByRole("button", { name: "Save roles" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Select at least 2 options",
      );
      expect(apiFetcher).not.toHaveBeenCalled();
    });

    it("should display the configured minimum selection error message and prevent submission", async () => {
      const user = userEvent.setup();
      const apiFetcher = vi.fn();
      const minRolesSchema: FormSchema = {
        ...multiSelectFormSchema,
        fields: [
          {
            ...multiSelectFormSchema.fields[0],
            validation: {
              min: 2,
              messages: { min: "Select at least 2 roles" },
            },
          },
        ],
      };

      renderWithProviders(
        <FormRenderer
          schema={minRolesSchema}
          apiFetcher={apiFetcher as never}
        />,
        { messages: {}, session },
      );

      await user.click(screen.getByRole("button", { name: "Save roles" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Select at least 2 roles",
      );
      expect(apiFetcher).not.toHaveBeenCalled();
    });
  });

  describe("when valid options are selected and the form is submitted", () => {
    it("should submit the selected values", async () => {
      const user = userEvent.setup();
      const apiFetcher = vi
        .fn()
        .mockResolvedValue(new Response("{}", { status: 200 }));
      renderRolesForm(apiFetcher);

      await user.click(screen.getByRole("combobox"));
      const adminOption = await screen.findByRole("option", {
        name: "Administrator",
      });
      await user.click(adminOption);

      const editorOption = screen.getByRole("option", { name: "Editor" });
      await user.click(editorOption);

      await user.click(screen.getByRole("button", { name: "Save roles" }));

      await waitFor(() =>
        expect(apiFetcher).toHaveBeenCalledWith(
          "/api/roles",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ roles: ["admin", "editor"] }),
          }),
        ),
      );
    });
  });

  describe("when options are preselected by default", () => {
    it("should display and submit the preselected options", async () => {
      const user = userEvent.setup();
      const apiFetcher = vi
        .fn()
        .mockResolvedValue(new Response("{}", { status: 200 }));
      const defaultRolesSchema: FormSchema = {
        ...multiSelectFormSchema,
        fields: [
          {
            ...multiSelectFormSchema.fields[0],
            defaultValue: ["admin"],
          },
        ],
      };

      renderWithProviders(
        <FormRenderer
          schema={defaultRolesSchema}
          apiFetcher={apiFetcher as never}
        />,
        { messages: {}, session },
      );

      expect(screen.getByText("Administrator")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Save roles" }));

      await waitFor(() =>
        expect(apiFetcher).toHaveBeenCalledWith(
          "/api/roles",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ roles: ["admin"] }),
          }),
        ),
      );
    });
  });

  describe("when initial selections are provided to the form", () => {
    it("should display and submit the provided initial selections", async () => {
      const user = userEvent.setup();
      const apiFetcher = vi
        .fn()
        .mockResolvedValue(new Response("{}", { status: 200 }));

      renderWithProviders(
        <FormRenderer
          schema={multiSelectFormSchema}
          defaultValues={{ roles: ["editor", "viewer"] }}
          apiFetcher={apiFetcher as never}
        />,
        { messages: {}, session },
      );

      expect(screen.getByText("Editor")).toBeInTheDocument();
      expect(screen.getByText("Viewer")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Save roles" }));

      await waitFor(() =>
        expect(apiFetcher).toHaveBeenCalledWith(
          "/api/roles",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ roles: ["editor", "viewer"] }),
          }),
        ),
      );
    });
  });
});
