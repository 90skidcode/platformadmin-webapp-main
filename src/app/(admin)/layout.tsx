import { redirect } from "next/navigation";

import { auth } from "@/auth/auth";
import { AppShell, NAV_ITEMS } from "@/components/app-shell";
import { EnvironmentProvider } from "@/lib/environment";
import { TenantProvider } from "@/lib/tenant";
import { filterNavByAccess } from "@/lib/permissions";

/**
 * The authoritative auth check (plan §4.4/§13): `proxy.ts`'s redirect is UX,
 * not the security boundary. Every admin route sits under `app/(admin)/`,
 * so this one layout check covers all of them -- don't add a second route
 * group later without repeating it.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <EnvironmentProvider>
      <TenantProvider>
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
