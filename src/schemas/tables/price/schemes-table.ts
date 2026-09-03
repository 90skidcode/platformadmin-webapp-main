import { apiEndpoints } from "@/lib/api-endpoints";
import type { TableSchema } from "@/components/table";
import {
  statusColumn,
  statusFilter,
  auditColumns,
  createDeleteAction,
} from "../common-columns";

export const schemesTableSchema: TableSchema = {
  id: "schemes-table",
  i18nNamespace: "tables.schemes",
  mode: "server",
  endpoint: { url: apiEndpoints.price.schemes.list },
  search: { enabled: true },
  filters: [
    statusFilter,
    {
      accessorKey: "new_used",
      label: "New / Used",
      options: [
        { value: "NEW", label: "New" },
        { value: "USED", label: "Used" },
      ],
    },
    {
      accessorKey: "vehicle_type",
      label: "Vehicle Type",
      options: [
        { value: "2W", label: "2 Wheeler" },
        { value: "4W", label: "4 Wheeler" },
        { value: "CV", label: "Commercial Vehicle" },
      ],
    },
    {
      accessorKey: "scheme_group",
      label: "Scheme Group",
      options: [
        { value: "1", label: "Group 1" },
        { value: "2", label: "Group 2" },
        { value: "3", label: "Group 3" },
      ],
    },
  ],
  pageSize: 10,
  columns: [
    { accessorKey: "scheme_id", header: "Scheme ID", sortable: true },
    {
      accessorKey: "scheme_description",
      header: "Scheme Description",
      sortable: true,
    },
    { accessorKey: "new_used", header: "New / Used", sortable: true },
    { accessorKey: "vehicle_type", header: "Vehicle Type", sortable: true },
    { accessorKey: "scheme_group", header: "Scheme Group", sortable: true },
    statusColumn,
    ...auditColumns,
  ],
  rowActions: [
    {
      id: "edit",
      labelKey: "actions.edit",
      icon: "pencil",
      handler: "custom",
      onClick: "editScheme",
    },
    createDeleteAction(apiEndpoints.price.schemes.byId("{scheme_id}")),
  ],
};
