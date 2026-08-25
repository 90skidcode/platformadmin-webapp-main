"use client";

import { SessionProvider } from "next-auth/react";

/** Client-only wrapper -- `useSession()` (used by form/table `permission`
 * gates, the Topbar user menu, etc.) needs this context above it. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
