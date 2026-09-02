import { redirect } from "next/navigation";

import { auth } from "@/auth/auth";
import { AppShell, NAV_ITEMS } from "@/components/app-shell";
import { SessionInactivityWatcher } from "@/components/auth/session-inactivity-watcher";
import { getInitialLastActiveAt } from "@/lib/auth/session-activity.server";
import {
  SESSION_ERRORS,
  SESSION_EXPIRED_LOGIN_URL,
} from "@/lib/auth/session-constants";
import { EnvironmentProvider } from "@/lib/environment";
import { TenantProvider } from "@/lib/tenant";
import { filterNavByAccess } from "@/lib/permissions";

/**
 * The authoritative auth check (plan §4.4/§13): `proxy.ts`'s redirect is UX,
 * not the security boundary. Every admin route sits under `app/(admin)/`,
 * so this one layout check covers all of them -- don't add a second route
 * group later without repeating it.
 *
 * Mounts SessionInactivityWatcher to handle warning modal, inactivity expiry,
 * and multi-tab synchronization. Passes the live `initialLastActiveAt` resolved
 * on the server via `getInitialLastActiveAt(session)`.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.error === SESSION_ERRORS.EXPIRED) {
    redirect(SESSION_EXPIRED_LOGIN_URL);
  }

  const lastActiveAt = await getInitialLastActiveAt(session);

  return (
    <EnvironmentProvider>
      <TenantProvider>
        <SessionInactivityWatcher
          initialLastActiveAt={lastActiveAt > 0 ? lastActiveAt : undefined}
        />
        <AppShell
          nav={filterNavByAccess(NAV_ITEMS, session)}
          title={session.user.name ?? session.user.email ?? undefined}
        >
          {children}
        </AppShell>
      </TenantProvider>
    </EnvironmentProvider>
  );
}
