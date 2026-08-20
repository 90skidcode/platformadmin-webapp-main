import type { FormSchema } from "@/components/form";

export const addUserFormSchema: FormSchema = {
  id: "add-user-form",
  i18nNamespace: "tables.users",
  layout: {
    columns: 1,
  },
  fields: [
    {
      name: "name",
      type: "text",
      placeholder: "Enter Name",
      labelKey: "addUserForm.name",
      validation: {
        required: true,
      },
    },
    {
      name: "email",
      type: "email",
      labelKey: "addUserForm.email",
      placeholder: "Enter Email",
      autoComplete: "off",
      validation: {
        required: true,
      },
    },
    {
      name: "password",
      type: "password",
      placeholder: "Enter Password",
      labelKey: "addUserForm.password",
      autoComplete: "new-password",
      validation: {
        required: true,
        minLength: 8,
        pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\w\\s]).{8,}$",
        messages: {
          minLength: "Password must be at least 8 characters.",
          pattern:
            "Password must contain an uppercase letter, lowercase letter, number, and special character.",
        },
      },
    },
  ],
  actions: [
    {
      id: "submit",
      type: "submit",
      labelKey: "actions.submit",
      variant: "primary",
      onClick: "addUser",
      onSuccess: {
        toast: {
          variant: "success",
          messageKey: "toast.addUser",
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
