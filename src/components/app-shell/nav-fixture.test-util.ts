import type { NavItem } from "./nav-items";

/** Shared between sidebar.test.tsx and bottom-nav.test.tsx -- same input,
 * same filtering, so passing on both is what actually proves parity (plan §15). */
export const NAV_FIXTURE: NavItem[] = [
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
    id: "settings",
    labelKey: "nav.settings",
    href: "/settings",
    icon: "settings",
    roles: ["admin"],
  },
];
