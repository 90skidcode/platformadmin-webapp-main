export interface NavItem {
  id: string;
  labelKey: string;
  href: string;
  /** Resolved via the lucide-react icon registry (icon-registry.tsx). */
  icon: string;
  /** Visible if the user has ANY of these (OR). */
  roles?: string[];
  /** Visible if `can(permission)` is true (AND, if `roles` is also set). */
  permission?: string;
  badge?: { count?: number; variant?: "default" | "destructive" };
  /** Desktop sidebar only; bottom nav flattens/ignores. */
  children?: NavItem[];
}

// Audit log / settings / style guide pages were removed (Users is the only
// screen this app has right now) -- this is where their nav entries went.
export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    labelKey: "nav.dashboard",
    href: "/",
    icon: "layoutDashboard",
  },
  {
    id: "users",
    labelKey: "nav.users",
    href: "/users",
    icon: "users",
    // permission: "users.read", -- temporarily stripped, no roles/permissions
    // source from the backend yet (see resolve-roles.ts / permissions.ts)
  },
];
