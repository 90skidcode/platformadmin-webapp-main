import * as React from "react";

export interface UseControllableStateProps<T> {
  value?: T;
  defaultValue: T;
  onChange?: (value: T) => void;
}

/** Backs every open/checked/value prop across the local primitives (Dialog's
 * `open`, Checkbox/Switch's `checked`, Select's `value`, ...): works both
 * controlled (`value` passed) and uncontrolled (only `defaultValue`), same
 * dual mode every Radix primitive supported. */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateProps<T>): [T, (next: T) => void] {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? (value as T) : uncontrolled;

  const setValue = React.useCallback(
    (next: T) => {
      if (!isControlled) setUncontrolled(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  return [current, setValue];
}
