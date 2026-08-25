import * as React from "react";

import { mergeRefs } from "./merge-refs";

type AnyProps = Record<string, unknown>;

function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  const merged: AnyProps = { ...slotProps, ...childProps };
  for (const key in childProps) {
    const slotValue = slotProps[key];
    const childValue = childProps[key];
    const isHandler = /^on[A-Z]/.test(key);
    if (
      isHandler &&
      typeof slotValue === "function" &&
      typeof childValue === "function"
    ) {
      // Both the Slot's own handler (e.g. Button's onClick-adjacent logic)
      // and the consumer's child handler run -- child first, same order
      // Radix's Slot uses.
      merged[key] = (...args: unknown[]) => {
        (childValue as (...a: unknown[]) => void)(...args);
        (slotValue as (...a: unknown[]) => void)(...args);
      };
    } else if (
      key === "className" &&
      typeof slotValue === "string" &&
      typeof childValue === "string"
    ) {
      merged[key] = `${slotValue} ${childValue}`.trim();
    } else if (
      key === "style" &&
      typeof slotValue === "object" &&
      slotValue !== null &&
      typeof childValue === "object" &&
      childValue !== null
    ) {
      merged[key] = { ...slotValue, ...childValue };
    }
  }
  return merged;
}

/**
 * Local replacement for `@radix-ui/react-slot`'s `asChild` pattern: merges
 * the props a component would've rendered onto its own element (className,
 * style, event handlers, ref) onto the single child element instead, so
 * e.g. `<Button asChild><Link .../></Button>` renders one real `<a>`, not a
 * `<button>` wrapping an `<a>`.
 */
export const Slot = React.forwardRef<
  HTMLElement,
  AnyProps & { children?: React.ReactNode }
>(({ children, ...slotProps }, ref) => {
  if (!React.isValidElement(children)) {
    // Slot requires exactly one valid element child -- same contract Radix's
    // Slot has; nothing sensible to render otherwise.
    return null;
  }
  const child = children as React.ReactElement<AnyProps> & {
    ref?: React.Ref<HTMLElement>;
  };
  return React.cloneElement(child, {
    ...mergeProps(slotProps, child.props),
    ref: ref ? mergeRefs(ref, child.ref) : child.ref,
  } as AnyProps);
});
Slot.displayName = "Slot";
