import { apiEndpoints } from "@/lib/api-endpoints";
import type { TableSchema } from "@/components/table";

// `.ts`, not `.json`, so `endpoint.url` can come from `apiEndpoints.ts`
// instead of a hand-typed literal (§6.2). `deactivate`'s url keeps the
// `{id}` placeholder -- `interpolateRow` substitutes it from the row at
// click time -- which is why `apiEndpoints.users.byId` is called with the
// literal string `"{id}"` rather than a real id.
export const usersTableSchema: TableSchema = {
  id: "users-table",
  i18nNamespace: "tables.users",
  mode: "server",
  endpoint: { url: apiEndpoints.users.list },
  search: { enabled: true },
  filters: [
    {
      accessorKey: "status",
      labelKey: "columns.status",
      options: [
        { value: "active", labelKey: "status.active" },
        { value: "inactive", labelKey: "status.inactive" },
      ],
    },
  ],
  pageSize: 10,
  columns: [
    { accessorKey: "name", headerKey: "columns.name", sortable: true },
    {
      accessorKey: "email",
      headerKey: "columns.email",
      cell: "email",
      sortable: true,
    },
    {
      accessorKey: "status",
      headerKey: "columns.status",
      cell: "badge",
      badgeVariants: {
        active: "success",
        invited: "warning",
        deactivated: "destructive",
      },
    },
    {
      accessorKey: "created_at",
      headerKey: "columns.created_at",
      cell: "date",
      sortable: true,
    },
    {
      accessorKey: "updated_at",
      headerKey: "columns.updated_at",
      cell: "date",
      sortable: true,
    },
  ],
  rowActions: [
    {
      id: "edit-roles",
      labelKey: "actions.editRoles",
      icon: "pencil",
      handler: "custom",
      onClick: "editRoles",
      permission: "users.write",
    },
    {
      id: "remove-user",
      labelKey: "actions.deactivate",
      icon: "trash",
      handler: "api",
      endpoint: {
        method: "DELETE",
        url: apiEndpoints.users.byId("{id}"),
      },
      confirm: {
        titleKey: "confirm.deactivate.title",
        messageKey: "confirm.deactivate.message",
      },
      permission: "users.deactivate",
      onSuccess: {
        toast: { variant: "success", messageKey: "toast.deactivated" },
        refetch: true,
      },
      onError: {
        toast: { variant: "error", messageKey: "toast.genericError" },
      },
    },
  ],
};
