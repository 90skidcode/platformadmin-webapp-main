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
    permission: "users.read",
  },
  {
    id: "audit-log",
    labelKey: "nav.auditLog",
    href: "/audit-log",
    icon: "history",
    permission: "audit.read",
  },
  {
    id: "settings",
    labelKey: "nav.settings",
    href: "/settings",
    icon: "settings",
    // Layered gate, deliberately: viewer has `settings.read` but not the role,
    // so this stays hidden for them -- demonstrates roles AND permission
    // combining, not just permission alone (plan §5).
    roles: ["platform-admin", "manager"],
    permission: "settings.read",
  },
  {
    id: "style-guide",
    labelKey: "nav.styleGuide",
    href: "/style-guide",
    icon: "palette",
    roles: ["platform-admin"],
  },
];
