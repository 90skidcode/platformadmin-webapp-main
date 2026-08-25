"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { getCookie, setCookie } from "@/lib/utils/cookies";

// Client-safe: no URLs, just what the switcher needs to render. The actual
// URL-per-environment mapping lives server-only in
// lib/backend-client/environment-config.server.ts (plan §6.1).
export interface Environment {
  id: string;
  labelKey: string;
}

export const ENVIRONMENTS: Environment[] = [
  { id: "dev", labelKey: "environments.dev" },
  { id: "staging", labelKey: "environments.staging" },
  { id: "production", labelKey: "environments.production" },
];

const ENVIRONMENT_COOKIE = "admin-environment";

interface EnvironmentContextValue {
  active: Environment;
  environments: Environment[];
  setActive: (id: string) => void;
}

const EnvironmentContext = createContext<EnvironmentContextValue | null>(null);

// `document.cookie` has no native change event, and we're the only writer
// (via setActive below) -- there's nothing to subscribe to.
function subscribe() {
  return () => {};
}
function getSnapshot() {
  return getCookie(ENVIRONMENT_COOKIE);
}
// `document` doesn't exist during SSR; null here (matching the server render)
// is what lets React re-sync to the real cookie value right after hydration
// without a mismatch warning -- no manual effect+setState needed.
function getServerSnapshot() {
  return null;
}

export function EnvironmentProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const cookieId = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [manualId, setManualId] = useState<string | null>(null);

  const resolvedId =
    manualId ??
    (cookieId && ENVIRONMENTS.some((e) => e.id === cookieId)
      ? cookieId
      : ENVIRONMENTS[0].id);
  const active =
    ENVIRONMENTS.find((e) => e.id === resolvedId) ?? ENVIRONMENTS[0];

  const value = useMemo<EnvironmentContextValue>(
    () => ({
      active,
      environments: ENVIRONMENTS,
      setActive: (id: string) => {
        setManualId(id);
        setCookie(ENVIRONMENT_COOKIE, id, { days: 365 });
      },
    }),
    [active],
  );

  return (
    <EnvironmentContext.Provider value={value}>
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment() {
  const ctx = useContext(EnvironmentContext);
  if (!ctx)
    throw new Error(
      "useEnvironment must be used within an EnvironmentProvider",
    );
  return ctx;
}
