import * as React from "react";

/** Combines multiple refs (a forwarded ref plus an internal one a component
 * needs for itself -- focus management, outside-click detection, ...) into
 * one callback ref that updates all of them. */
export function mergeRefs<T>(...refs: Array<React.Ref<T> | null | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as React.RefObject<T | null>).current = node;
    }
  };
}
