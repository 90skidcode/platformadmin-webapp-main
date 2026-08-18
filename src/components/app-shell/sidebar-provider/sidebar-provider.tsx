"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const SIDEBAR_STORAGE_KEY = "admin-sidebar-collapsed";
// No stored preference yet (first-ever visit): sidebar starts shrunk.
const DEFAULT_COLLAPSED = true;

interface SidebarContextValue {
  /** Desktop Sidebar only -- BottomNav (mobile) ignores this entirely. */
  collapsed: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function readStoredValue(): string | null {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
  } catch {
    // Storage disabled/unavailable (e.g. private browsing) -- fall back to
    // treating it as "no preference stored".
    return null;
  }
}

// `localStorage` has no native change event, and we're the only writer
// (via toggle() below) -- there's nothing to subscribe to. Mirrors
// EnvironmentProvider's cookie pattern (lib/environment/environment-provider.tsx).
function subscribe() {
  return () => {};
}
function getSnapshot() {
  return readStoredValue();
}
// `window` doesn't exist during SSR; null here (matching the server
// render's default-collapsed state) is what lets React re-sync to the real
// stored value right after hydration without a mismatch warning.
function getServerSnapshot() {
  return null;
}

export function SidebarProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const storedValue = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  // Storage alone can't drive same-session re-renders (no change event to
  // subscribe to, see above) -- this local override is what makes toggle()
  // update the UI immediately; localStorage exists purely so a reload/new
  // tab starts from the last-chosen state instead of always resetting.
  const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(null);

  const collapsed =
    manualCollapsed ??
    (storedValue === null ? DEFAULT_COLLAPSED : storedValue === "1");

  const value = useMemo<SidebarContextValue>(
    () => ({
      collapsed,
      toggle: () => {
        const next = !collapsed;
        setManualCollapsed(next);
        try {
          window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
        } catch {
          // Storage disabled/unavailable -- the in-memory override above
          // still keeps this tab/session in sync.
        }
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
