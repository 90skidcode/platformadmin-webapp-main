import { apiEndpoints } from "@/lib/api-endpoints";
import type { TableSchema } from "@/components/table";
import type { FormSchema } from "@/components/form";
import auditLogsFilterFormSchema from "@/schemas/forms/audit-logs-filter-form.json";

export interface AuditLogRow {
  [key: string]: unknown;
  id: string;
  actor?: string;
  actor_id?: string;
  actor_email?: string;
  user?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  actor_type?: string;
  ip_address?: string;
  created_at: string;
}

export const auditLogsTableSchema: TableSchema = {
  id: "audit-logs-table",
  i18nNamespace: "tables.auditLogs",
  mode: "server",
  endpoint: { url: apiEndpoints.auditLogs.list },
  search: { enabled: false },
  pageSize: 20,
  filterSchema: auditLogsFilterFormSchema as unknown as FormSchema,
  filters: [
    {
      accessorKey: "date_range",
      fromParamName: "from_date",
      toParamName: "to_date",
      labelKey: "filters.dateRange",
      type: "date-range",
      disableFuture: true,
    },
    {
      accessorKey: "action",
      labelKey: "columns.action",
      options: [
        { value: "auth.login.success", label: "auth.login.success" },
        { value: "auth.login.failure", label: "auth.login.failure" },
        { value: "auth.logout", label: "auth.logout" },
        { value: "user.create", label: "user.create" },
        { value: "user.update", label: "user.update" },
        { value: "user.delete", label: "user.delete" },
        { value: "role.create", label: "role.create" },
        { value: "role.update", label: "role.update" },
        { value: "role.delete", label: "role.delete" },
      ],
    },
    {
      accessorKey: "resource_type",
      labelKey: "columns.resourceType",
      options: [
        { value: "user", labelKey: "resourceTypes.user" },
        { value: "role", labelKey: "resourceTypes.role" },
        { value: "tenant", labelKey: "resourceTypes.tenant" },
        { value: "auth", labelKey: "resourceTypes.auth" },
        { value: "system", labelKey: "resourceTypes.system" },
      ],
    },
    {
      accessorKey: "actor_type",
      labelKey: "columns.actorType",
      options: [
        { value: "user", labelKey: "actorTypes.user" },
        { value: "system", labelKey: "actorTypes.system" },
        { value: "service", labelKey: "actorTypes.service" },
      ],
    },
  ],
  columns: [
    {
      accessorKey: "actor",
      headerKey: "columns.user",
      sortable: true,
    },
    {
      accessorKey: "action",
      headerKey: "columns.action",
      sortable: true,
    },
    {
      accessorKey: "resource_type",
      headerKey: "columns.resourceType",
      sortable: true,
    },
    {
      accessorKey: "actor_type",
      headerKey: "columns.actorType",
    },
    {
      accessorKey: "ip_address",
      headerKey: "columns.ipAddress",
    },
    {
      accessorKey: "created_at",
      headerKey: "columns.createdAt",
      cell: "datetime",
      sortable: true,
    },
  ],
};
