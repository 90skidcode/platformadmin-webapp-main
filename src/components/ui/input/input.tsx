import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Marks the field as failing validation -- pairs with `aria-invalid` and red-border styling. */
  invalid?: boolean;
  /** When true or when type="number", restricts input to numeric digits (0-9) */
  numericOnly?: boolean;
  /** Whether to show the toggle password visibility button (defaults to true for type="password") */
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      invalid,
      numericOnly,
      showPasswordToggle = type === "password",
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isNumeric = numericOnly || type === "number";

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isNumeric) {
        const isControlKey =
          [
            "Backspace",
            "Tab",
            "Delete",
            "ArrowLeft",
            "ArrowRight",
            // "ArrowUp",
            // "ArrowDown",
            "Home",
            "End",
            "Enter",
          ].includes(e.key) ||
          e.ctrlKey ||
          e.metaKey;

        if (!/^\d$/.test(e.key) && !isControlKey) {
          e.preventDefault();
        }
      }
      onKeyDown?.(e);
    };

    const isPassword = type === "password";
    const actualType = isPassword && showPassword ? "text" : type;

    const inputElement = (
      <input
        ref={ref}
        type={actualType}
        aria-invalid={invalid || undefined}
        onKeyDown={handleKeyDown}
        className={cn(
          // eslint-disable-next-line tailwindcss/no-arbitrary-value
          "flex h-10 w-full [appearance:textfield] rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors duration-[var(--duration-fast)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          isPassword && showPasswordToggle && "pe-10",
          className,
        )}
        {...props}
      />
    );

    if (isPassword && showPasswordToggle) {
      return (
        <div className="relative flex w-full items-center">
          {inputElement}
          <button
            type="button"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute end-2 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      );
    }

    return inputElement;
  },
);
Input.displayName = "Input";
