import { apiEndpoints } from "@/lib/api-endpoints";
import type { TableSchema } from "@/components/table";

// `.ts`, not `.json`, so `endpoint.url` can come from `apiEndpoints.ts`
// instead of a hand-typed literal (§6.2). `delete`'s url keeps the `{id}`
// placeholder -- `interpolateRow` substitutes it from the row at click
// time -- which is why `apiEndpoints.users.byId` is called with the
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
      placeholder: "All Statuses",
      options: [
        { value: "active", labelKey: "status.active" },
        { value: "inactive", labelKey: "status.inactive" },
      ],
    },
  ],
  pageSize: 10,
  // Real `/users` records are `{ id, name, email, status, created_at,
  // updated_at }` -- no `roles` (see nav-items.ts's note on RBAC being
  // stripped for now), hence no roles column here either.
  columns: [
    { accessorKey: "name", headerKey: "columns.name", sortable: true },
    { accessorKey: "email", headerKey: "columns.email", cell: "email" },
    {
      accessorKey: "status",
      headerKey: "columns.status",
      cell: "badge",
      badgeVariants: {
        active: "success",
        inactive: "destructive",
      },
    },
    {
      accessorKey: "created_at",
      headerKey: "columns.createdAt",
      cell: "datetime",
      sortable: true,
    },
    {
      accessorKey: "updated_at",
      headerKey: "columns.updatedAt",
      cell: "datetime",
      sortable: true,
    },
    {
      accessorKey: "created_by",
      headerKey: "columns.createdBy",
    },
    {
      accessorKey: "updated_by",
      headerKey: "columns.updatedBy",
    },
  ],
  // `permission` gates below are temporarily stripped, same reason as
  // nav-items.ts -- restore once the backend has real roles/permissions.
  rowActions: [
    {
      id: "edit",
      labelKey: "actions.edit",
      icon: "pencil",
      handler: "custom",
      onClick: "editUser",
      // permission: "users.write",
    },
    {
      // Real `DELETE /users/{id}` (confirmed against a live response) --
      // hard delete, no body, 200 with `data: null`. Replaces the old
      // PATCH-status-to-"deactivated" placeholder now that a real endpoint
      // exists for it.
      id: "delete",
      labelKey: "actions.delete",
      icon: "trash",
      handler: "api",
      endpoint: {
        method: "DELETE",
        url: apiEndpoints.users.byId("{id}"),
      },
      confirm: {
        titleKey: "confirm.delete.title",
        messageKey: "confirm.delete.message",
      },
      // permission: "users.delete",
      onSuccess: {
        toast: { variant: "success", messageKey: "toast.deleted" },
        refetch: true,
      },
      onError: {
        toast: { variant: "error", messageKey: "toast.genericError" },
      },
    },
  ],
};
