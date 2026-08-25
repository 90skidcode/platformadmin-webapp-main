import type { Session } from "next-auth";

/** One access-control concept, checked in three places: nav items (§5),
 * form action `permission` (§7.1), table row/bulk action `permission` (§7.2). */
export function can(
  permission: string,
  session: Session | null | undefined,
): boolean {
  return !!session?.user?.permissions?.includes(permission);
}

export function hasAnyRole(
  roles: string[] | undefined,
  session: Session | null | undefined,
): boolean {
  if (!roles || roles.length === 0) return true;
  if (!session) return false;
  return roles.some((r) => session.user.roles.includes(r));
}

export interface AccessGated {
  roles?: string[];
  permission?: string;
}

/** `roles` (OR) and `permission` (AND, if both set) combined -- same gate
 * shape for nav items, form actions, and table row/bulk actions. */
export function hasAccess(
  item: AccessGated,
  session: Session | null | undefined,
): boolean {
  if (!session) return false;
  if (!hasAnyRole(item.roles, session)) return false;
  if (item.permission && !can(item.permission, session)) return false;
  return true;
}

/** Sidebar and BottomNav both call this before rendering -- same filtering
 * logic, so a nav item hidden on desktop is guaranteed hidden on mobile too. */
export function filterNavByAccess<T extends AccessGated & { children?: T[] }>(
  items: T[],
  session: Session | null | undefined,
): T[] {
  return items
    .filter((item) => hasAccess(item, session))
    .map((item) =>
      item.children
        ? { ...item, children: filterNavByAccess(item.children, session) }
        : item,
    );
}
