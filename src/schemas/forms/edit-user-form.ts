import type { FormSchema } from "@/components/form";

export const editUserFormSchema: FormSchema = {
  id: "edit-user-roles-form",
  i18nNamespace: "tables.users",
  layout: {
    columns: 1,
  },
  fields: [
    {
      name: "name",
      type: "text",
      labelKey: "editUserDialog.name",
      validation: {
        required: true,
      },
    },
    {
      name: "email",
      type: "email",
      labelKey: "editUserDialog.email",
      validation: {
        required: true,
      },
    },
    {
      name: "status",
      type: "select",
      labelKey: "editUserDialog.statusLabel",
      validation: {
        required: true,
      },
      optionsSource: {
        type: "static",
        options: [
          { value: "active", labelKey: "status.active" },
          { value: "inactive", labelKey: "status.inactive" },
        ],
      },
    },
  ],
  actions: [
    {
      id: "submit",
      type: "submit",
      labelKey: "actions.save",
      variant: "primary",
      onClick: "updateUser",
      onSuccess: {
        toast: {
          variant: "success",
          messageKey: "toast.rolesUpdated",
        },
        refetch: true,
      },
      onError: {
        toast: {
          variant: "error",
          messageKey: "toast.genericError",
        },
      },
    },
  ],
};
