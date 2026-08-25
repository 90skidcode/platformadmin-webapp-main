import type { NavItem } from "../nav-items";
import { Sidebar } from "../sidebar";
import { SidebarProvider } from "../sidebar-provider";
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
 * same list, so visibility can never diverge between breakpoints (§5).
 *
 * SidebarProvider wraps just Sidebar + Topbar (not BottomNav, which ignores
 * collapse entirely) -- it's the one shared context that lets Topbar's
 * toggle button and Sidebar's own width/logo/labels agree on state. */
export function AppShell({ nav, title, children }: Readonly<AppShellProps>) {
  return (
    <SidebarProvider>
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
    </SidebarProvider>
  );
}
