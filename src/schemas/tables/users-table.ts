import { apiEndpoints } from "@/lib/api-endpoints";
import type { TableSchema } from "@/components/table";
import {
  statusColumn,
  statusFilter,
  auditColumns,
  createDeleteAction,
} from "./common-columns";

export const usersTableSchema: TableSchema = {
  id: "users-table",
  i18nNamespace: "tables.users",
  mode: "server",
  endpoint: { url: apiEndpoints.users.list },
  search: { enabled: true },
  filters: [statusFilter],
  pageSize: 10,
  columns: [
    { accessorKey: "name", headerKey: "columns.name", sortable: true },
    { accessorKey: "email", headerKey: "columns.email", cell: "email" },
    statusColumn,
    ...auditColumns,
  ],
  rowActions: [
    {
      id: "edit",
      labelKey: "actions.edit",
      icon: "pencil",
      handler: "custom",
      onClick: "editUser",
    },
    createDeleteAction(apiEndpoints.users.byId("{id}")),
  ],
};
