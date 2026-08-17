"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { useControllableState } from "../primitives";

export type CheckedState = boolean | "indeterminate";

export interface CheckboxProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "checked" | "defaultChecked" | "onChange"
  > {
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    {
      className,
      checked,
      defaultChecked = false,
      onCheckedChange,
      disabled,
      onClick,
      ...props
    },
    ref,
  ) => {
    const [state, setState] = useControllableState<CheckedState>({
      value: checked,
      defaultValue: defaultChecked,
      onChange: (next) => onCheckedChange?.(next === true),
    });

    function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
      onClick?.(event);
      if (event.defaultPrevented || disabled) return;
      // Clicking an indeterminate checkbox always lands on checked, same as
      // clicking an unchecked one -- there's no click path back to
      // "indeterminate", only a controlled prop can set that.
      setState(state !== true);
    }

    const dataState =
      state === "indeterminate"
        ? "indeterminate"
        : { true: "checked", false: "unchecked" }[String(state)];

    return (
      // A button with role="checkbox" + aria-checked is the W3C ARIA APG's
      // own documented custom-checkbox pattern (needed for the indeterminate
      // visual state a native <input type="checkbox"> can only express via
      // JS-set .indeterminate, not a static attribute/prop) -- exactly what
      // @radix-ui/react-checkbox did under the hood before this replaced it.
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={state === "indeterminate" ? "mixed" : state}
        data-state={dataState}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "peer size-4 shrink-0 rounded-sm border border-input shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
          className,
        )}
        {...props}
      >
        {state !== false && (
          <span className="flex items-center justify-center text-current">
            {state === "indeterminate" ? (
              <Minus className="size-3" aria-hidden="true" />
            ) : (
              <Check className="size-3" aria-hidden="true" />
            )}
          </span>
        )}
      </button>
    );
  },
);
Checkbox.displayName = "Checkbox";
