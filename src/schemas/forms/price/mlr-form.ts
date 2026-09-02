import type { FormField, FormSchema } from "@/components/form";

const mlrFields: FormField[] = [
  {
    name: "name",
    type: "text",
    labelKey: "columns.name",
    validation: { required: true },
  },
  {
    name: "lms_id",
    type: "text",
    labelKey: "columns.lms_id",
    validation: { required: true },
  },
  {
    name: "lms_name",
    type: "text",
    labelKey: "columns.lms_name",
  },
  {
    name: "provider_name",
    type: "text",
    labelKey: "columns.provider_name",
  },
  {
    name: "vehicle_type_id",
    type: "number",
    labelKey: "columns.vehicle_type_id",
  },
  {
    name: "brand_id",
    type: "number",
    labelKey: "columns.brand_id",
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
  { name: "rate_3y", type: "number", labelKey: "columns.rate_3y" },
  { name: "rate_4y", type: "number", labelKey: "columns.rate_4y" },
  { name: "rate_5y", type: "number", labelKey: "columns.rate_5y" },
  { name: "rate_6y", type: "number", labelKey: "columns.rate_6y" },
  { name: "rate_7y", type: "number", labelKey: "columns.rate_7y" },
];

export const createMlrFormSchema: FormSchema = {
  id: "create-mlr-form",
  i18nNamespace: "tables.mlr",
  layout: { columns: 2 },
  fields: mlrFields,
  actions: [
    {
      id: "submit",
      type: "submit",
      labelKey: "actions.save",
      variant: "primary",
      onClick: "createMlr",
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

export const editMlrFormSchema: FormSchema = {
  id: "edit-mlr-form",
  i18nNamespace: "tables.mlr",
  layout: { columns: 2 },
  fields: mlrFields.map((f) =>
    f.name === "lms_id" ? { ...f, disabled: true } : f,
  ),
  actions: [
    {
      id: "submit",
      type: "submit",
      labelKey: "actions.save",
      variant: "primary",
      onClick: "saveMlr",
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
