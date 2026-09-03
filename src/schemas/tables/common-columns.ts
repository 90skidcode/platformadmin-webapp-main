import type { TableColumn, TableFilter, RowAction } from "@/components/table";

export const statusColumn: TableColumn = {
  accessorKey: "status",
  headerKey: "columns.status",
  cell: "badge",
  badgeVariants: {
    active: "success",
    inactive: "destructive",
  },
  sortable: true,
};

export const statusFilter: TableFilter = {
  accessorKey: "status",
  labelKey: "columns.status",
  options: [
    { value: "all", labelKey: "status.all" },
    { value: "active", labelKey: "status.active" },
    { value: "inactive", labelKey: "status.inactive" },
  ],
};

export const auditColumns: TableColumn[] = [
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
];

export function createDeleteAction(url: string): RowAction {
  return {
    id: "delete",
    labelKey: "actions.delete",
    icon: "trash",
    handler: "api",
    endpoint: {
      method: "DELETE",
      url,
    },
    confirm: {
      titleKey: "confirm.delete.title",
      messageKey: "confirm.delete.message",
    },
    onSuccess: {
      toast: { variant: "success", messageKey: "toast.deleted" },
      refetch: true,
    },
    onError: {
      toast: { variant: "error", messageKey: "toast.genericError" },
    },
  };
}
