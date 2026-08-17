import type { NavItem } from "../nav-items";
import { Sidebar } from "../sidebar";
import { BottomNav } from "../bottom-nav";
import { Topbar } from "../topbar";

export interface AppShellProps {
  nav: NavItem[];
  title?: string;
  children: React.ReactNode;
}

/** Composes Sidebar (desktop) + BottomNav (mobile) + Topbar + main content.
 * `nav` is filtered once, server-side, by `(admin)/layout.tsx` before it
 * reaches here (plan §4.4) -- both Sidebar and BottomNav render the exact
 * same list, so visibility can never diverge between breakpoints (§5). */
export function AppShell({ nav, title, children }: Readonly<AppShellProps>) {
  return (
    <div className="flex min-h-screen">
      <Sidebar nav={nav} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} />
        <main className="flex-1 overflow-x-hidden pb-16 md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav nav={nav} />
    </div>
  );
}
