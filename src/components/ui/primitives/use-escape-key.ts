import * as React from "react";

/** Calls `onEscape` on a document-level Escape keydown while `enabled`.
 * Shared by every dismissible surface (Dialog, AlertDialog, DropdownMenu,
 * Select, Tooltip). */
export function useEscapeKey(onEscape: () => void, enabled: boolean) {
  React.useEffect(() => {
    if (!enabled) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onEscape();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onEscape, enabled]);
}
