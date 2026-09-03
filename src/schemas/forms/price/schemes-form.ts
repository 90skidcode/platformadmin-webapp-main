import type { FormField, FormSchema } from "@/components/form";

const schemeFields: FormField[] = [
  {
    name: "scheme_id",
    type: "number",
    labelKey: "columns.scheme_id",
    validation: { required: true },
  },
  {
    name: "scheme_description",
    type: "text",
    labelKey: "columns.scheme_description",
    validation: { required: true },
  },
  {
    name: "new_used",
    type: "select",
    labelKey: "columns.new_used",
    validation: { required: true },
    optionsSource: {
      type: "static",
      options: [
        { value: "NEW", label: "New" },
        { value: "USED", label: "Used" },
      ],
    },
  },
  {
    name: "vehicle_type",
    type: "select",
    labelKey: "columns.vehicle_type",
    validation: { required: true },
    optionsSource: {
      type: "static",
      options: [
        { value: "2W", label: "2 Wheeler" },
        { value: "4W", label: "4 Wheeler" },
        { value: "CV", label: "Commercial Vehicle" },
      ],
    },
  },
  {
    name: "scheme_group",
    type: "number",
    labelKey: "columns.scheme_group",
  },
  {
    name: "status",
    type: "select",
    labelKey: "columns.status",
    validation: { required: true },
    optionsSource: {
      type: "static",
      options: [
        { value: "active", labelKey: "status.active" },
        { value: "inactive", labelKey: "status.inactive" },
      ],
    },
  },
];

export const createSchemeFormSchema: FormSchema = {
  id: "create-scheme-form",
  i18nNamespace: "tables.schemes",
  layout: { columns: 1 },
  fields: schemeFields,
  actions: [
    {
      id: "submit",
      type: "submit",
      labelKey: "actions.save",
      variant: "primary",
      onClick: "createScheme",
      onSuccess: {
        toast: { variant: "success", messageKey: "toast.saved" },
        refetch: true,
      },
      onError: {
        toast: { variant: "error", messageKey: "toast.genericError" },
      },
    },
  ],
};

export const editSchemeFormSchema: FormSchema = {
  id: "edit-scheme-form",
  i18nNamespace: "tables.schemes",
  layout: { columns: 1 },
  fields: schemeFields.map((f) =>
    f.name === "scheme_id" ? { ...f, disabled: true } : f,
  ),
  actions: [
    {
      id: "submit",
      type: "submit",
      labelKey: "actions.save",
      variant: "primary",
      onClick: "saveScheme",
      onSuccess: {
        toast: { variant: "success", messageKey: "toast.saved" },
        refetch: true,
      },
      onError: {
        toast: { variant: "error", messageKey: "toast.genericError" },
      },
    },
  ],
};
