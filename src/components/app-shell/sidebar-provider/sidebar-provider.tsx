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

const SIDEBAR_COOKIE = "admin-sidebar-collapsed";

interface SidebarContextValue {
  /** Desktop Sidebar only -- BottomNav (mobile) ignores this entirely. */
  collapsed: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

// `document.cookie` has no native change event, and we're the only writer
// (via toggle() below) -- there's nothing to subscribe to. Mirrors
// EnvironmentProvider's cookie pattern (lib/environment/environment-provider.tsx).
function subscribe() {
  return () => {};
}
function getSnapshot() {
  return getCookie(SIDEBAR_COOKIE);
}
// `document` doesn't exist during SSR; null here (matching the server
// render's always-expanded state) is what lets React re-sync to the real
// cookie value right after hydration without a mismatch warning.
function getServerSnapshot() {
  return null;
}

export function SidebarProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const cookieValue = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  // Cookie alone can't drive same-session re-renders (no change event to
  // subscribe to, see above) -- this local override is what makes toggle()
  // update the UI immediately; the cookie exists purely so a reload/new tab
  // starts from the last-chosen state instead of always expanded.
  const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(null);

  const collapsed = manualCollapsed ?? cookieValue === "1";

  const value = useMemo<SidebarContextValue>(
    () => ({
      collapsed,
      toggle: () => {
        const next = !collapsed;
        setManualCollapsed(next);
        setCookie(SIDEBAR_COOKIE, next ? "1" : "0", { days: 365 });
      },
    }),
    [collapsed],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}
