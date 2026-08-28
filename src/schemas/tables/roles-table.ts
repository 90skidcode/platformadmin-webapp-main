import { apiEndpoints } from "@/lib/api-endpoints";
import type { TableSchema } from "@/components/table";

export interface RoleItem {
  [key: string]: unknown;
  id: string;
  name: string;
  code?: string;
  description?: string | null;
  status: string;
  screens?: string;
  permissions?: string[] | Record<string, boolean>;
  created_at?: string;
  updated_at?: string;
}

export const defaultRolesData: RoleItem[] = [
  {
    id: "super-admin",
    name: "Super Admin",
    code: "ROLE_SUPER_ADMIN",
    status: "active",
    description:
      "Full system control and unrestricted access across all screens and resources.",
    screens: "Dashboard, User, Profile",
    permissions: {
      dashboard_read: true,
      dashboard_write: true,
      users_read: true,
      users_write: true,
      profile_read: true,
      profile_write: true,
    },
  },
  {
    id: "platform-admin",
    name: "Platform Admin",
    code: "ROLE_PLATFORM_ADMIN",
    status: "active",
    description:
      "Administrative access to configure roles, view activity, and manage members.",
    screens: "Dashboard, User, Profile",
    permissions: {
      dashboard_read: false,
      dashboard_write: true,
      users_read: true,
      users_write: true,
      profile_read: true,
      profile_write: true,
    },
  },
  {
    id: "future-admin",
    name: "Future Admin",
    code: "ROLE_FUTURE_ADMIN",
    status: "active",
    description:
      "Configurable role template with customizable screen permissions.",
    screens: "Dashboard, User, Profile",
    permissions: {
      dashboard_read: true,
      dashboard_write: false,
      users_read: true,
      users_write: false,
      profile_read: true,
      profile_write: true,
    },
  },
];

export const rolesTableSchema: TableSchema = {
  id: "roles-table",
  i18nNamespace: "tables.roles",
  mode: "server",
  endpoint: { url: apiEndpoints.roles.list },
  search: { enabled: true },
  pageSize: 10,
  columns: [
    {
      accessorKey: "name",
      headerKey: "columns.name",
      cell: "link",
      linkTemplate: "/role-manager/{id}?mode=view",
      sortable: true,
    },
    {
      accessorKey: "description",
      headerKey: "columns.description",
      sortable: true,
    },
    {
      accessorKey: "status",
      headerKey: "columns.status",
      cell: "badge",
      badgeVariants: {
        active: "success",
        inactive: "destructive",
      },
    },
  ],
  rowActions: [
    {
      id: "edit",
      labelKey: "actions.edit",
      icon: "pencil",
      handler: "navigate",
      target: "/role-manager/{id}?mode=edit",
    },
    {
      id: "delete",
      labelKey: "actions.delete",
      icon: "trash",
      handler: "custom",
      onClick: "deleteRole",
      confirm: {
        titleKey: "confirm.delete.title",
        messageKey: "confirm.delete.message",
      },
    },
  ],
};
