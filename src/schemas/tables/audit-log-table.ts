import { apiEndpoints } from "@/lib/api-endpoints";
import type { TableSchema } from "@/components/table";

// `.ts`, not `.json`, so `endpoint.url` can come from `apiEndpoints.ts`
// instead of a hand-typed literal (§6.2).
export const auditLogTableSchema: TableSchema = {
  id: "audit-log-table",
  i18nNamespace: "tables.auditLog",
  mode: "server",
  endpoint: { url: apiEndpoints.auditLog },
  search: { enabled: true },
  pageSize: 10,
  columns: [
    { accessorKey: "actor", headerKey: "columns.actor", sortable: true },
    { accessorKey: "action", headerKey: "columns.action" },
    { accessorKey: "entity", headerKey: "columns.entity" },
    {
      accessorKey: "timestamp",
      headerKey: "columns.timestamp",
      cell: "date",
      sortable: true,
    },
  ],
  rowActions: [
    {
      id: "view",
      labelKey: "actions.view",
      icon: "eye",
      handler: "custom",
      onClick: "viewEntry",
    },
  ],
};
