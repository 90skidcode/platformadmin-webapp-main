"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

/**
 * Client-only wrapper -- `useSession()` (used by form/table `permission`
 * gates, the Topbar user menu, inactivity watcher, etc.) needs this context above it.
 *
 * Passing `session` from the root layout pre-hydrates client state on load,
 * eliminating redundant client-side GET /api/auth/session requests.
 * `refetchOnWindowFocus={false}` prevents unnecessary refetches on tab switching.
 */
export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}
