import * as React from "react";

/** Locks page scroll while a modal surface (Dialog/AlertDialog) is open. */
export function useBodyScrollLock(active: boolean) {
  React.useEffect(() => {
    if (!active) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [active]);
}
