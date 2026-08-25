"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";

import { getCookie, setCookie } from "@/lib/utils/cookies";

export interface Tenant {
  id: string;
  name: string;
}

const TENANT_COOKIE = "admin-tenant";

interface TenantContextValue {
  active: Tenant | null;
  tenants: Tenant[];
  setActive: (id: string) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

// Same rationale as environment-provider.tsx: no native cookie-change event,
// we're the only writer, and `getServerSnapshot` returning null is what lets
// React re-sync post-hydration without a manual effect+setState.
function subscribe() {
  return () => {};
}
function getSnapshot() {
  return getCookie(TENANT_COOKIE);
}
function getServerSnapshot() {
  return null;
}

/** Tenant list comes from the session (plan §6), not a static config --
 * unlike Environment, it's genuinely per-user. */
export function TenantProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { data: session } = useSession();
  const tenants = session?.user.tenants ?? [];
  const cookieId = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [manualId, setManualId] = useState<string | null>(null);

  const resolvedId =
    manualId ??
    (cookieId && tenants.some((t) => t.id === cookieId)
      ? cookieId
      : tenants[0]?.id);
  const active = tenants.find((t) => t.id === resolvedId) ?? tenants[0] ?? null;

  const value = useMemo<TenantContextValue>(
    () => ({
      active,
      tenants,
      setActive: (id: string) => {
        setManualId(id);
        setCookie(TENANT_COOKIE, id, { days: 365 });
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `tenants` is a fresh array from the session each render; comparing its id list (not identity) is what actually determines whether `active` can change.
    [active, tenants.map((t) => t.id).join(",")],
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within a TenantProvider");
  return ctx;
}
