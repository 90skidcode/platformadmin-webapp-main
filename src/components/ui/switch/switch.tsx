"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";
import { useControllableState } from "../primitives";

export interface SwitchProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "checked" | "defaultChecked" | "onChange"
  > {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
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
    const [state, setState] = useControllableState<boolean>({
      value: checked,
      defaultValue: defaultChecked,
      onChange: onCheckedChange,
    });

    function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
      onClick?.(event);
      if (event.defaultPrevented || disabled) return;
      setState(!state);
    }

    return (
      // Same rationale as Checkbox: a button with role="switch" is the ARIA
      // APG's own documented pattern for a fully custom-styled toggle.
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={state}
        data-state={state ? "checked" : "unchecked"}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
          )}
          data-state={state ? "checked" : "unchecked"}
        />
      </button>
    );
  },
);
Switch.displayName = "Switch";
