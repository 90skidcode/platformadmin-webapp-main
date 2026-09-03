import { apiEndpoints } from "@/lib/api-endpoints";
import type { TableSchema } from "@/components/table";
import {
  statusColumn,
  statusFilter,
  auditColumns,
  createDeleteAction,
} from "../common-columns";

export const mlrTableSchema: TableSchema = {
  id: "mlr-table",
  i18nNamespace: "tables.mlr",
  mode: "server",
  endpoint: { url: apiEndpoints.price.mlr.list },
  search: { enabled: true },
  filters: [
    statusFilter,
    {
      accessorKey: "provider_name",
      label: "Provider",
      options: [
        { value: "CARWALE", label: "CarWale" },
        { value: "CARTRADE", label: "CarTrade" },
        { value: "INTERNAL", label: "Internal" },
      ],
    },
  ],
  pageSize: 10,
  columns: [
    {
      accessorKey: "vehicle_type_id",
      header: "Vehicle Type ID",
      sortable: true,
    },
    { accessorKey: "brand_id", header: "Brand ID", sortable: true },
    { accessorKey: "lms_id", header: "LMS ID", sortable: true },
    { accessorKey: "name", header: "Name", sortable: true },
    { accessorKey: "lms_name", header: "LMS Name", sortable: true },
    { accessorKey: "provider_name", header: "Provider Name", sortable: true },
    statusColumn,
    { accessorKey: "rate_3y", header: "Rate (3Y)", sortable: true },
    { accessorKey: "rate_4y", header: "Rate (4Y)", sortable: true },
    { accessorKey: "rate_5y", header: "Rate (5Y)", sortable: true },
    { accessorKey: "rate_6y", header: "Rate (6Y)", sortable: true },
    { accessorKey: "rate_7y", header: "Rate (7Y)", sortable: true },
    ...auditColumns,
  ],
  rowActions: [
    {
      id: "edit",
      labelKey: "actions.edit",
      icon: "pencil",
      handler: "custom",
      onClick: "editMlr",
    },
    createDeleteAction(apiEndpoints.price.mlr.byId("{lms_id}")),
  ],
};
