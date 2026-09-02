import * as React from "react";

import { cn } from "@/lib/utils/cn";

export interface OtpInputProps {
  /** The current OTP value (controlled). */
  value?: string;
  /** Callback invoked when the OTP string changes. */
  onChange?: (value: string) => void;
  /** Optional callback invoked when all `length` digits are filled. */
  onComplete?: (value: string) => void;
  /** Number of digits in the OTP (default: 5). */
  length?: number;
  /** Disables all digit input fields. */
  disabled?: boolean;
  /** Visually marks the inputs as invalid. */
  invalid?: boolean;
  /** Focus the first empty input on mount. Defaults to true. */
  autoFocus?: boolean;
  /** Additional CSS class names for the outer container. */
  className?: string;
  /** Additional CSS class names for each input box. */
  inputClassName?: string;
  /** Accessible label for the OTP group. Defaults to "OTP code". */
  "aria-label"?: string;
  /** Base ID for individual inputs. */
  id?: string;
}

export function OtpInput({
  value = "",
  onChange,
  onComplete,
  length = 5,
  disabled = false,
  invalid = false,
  autoFocus = true,
  className,
  inputClassName,
  "aria-label": ariaLabel = "OTP code",
  id = "otp-input",
}: OtpInputProps) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Split the value into individual digits up to the specified length.
  const digits = React.useMemo(() => {
    return Array.from({ length }, (_, i) => value[i] ?? "");
  }, [value, length]);

  // Focus the first empty box (or the first box) on initial mount if autoFocus is true.
  React.useEffect(() => {
    if (autoFocus && !disabled) {
      const firstEmptyIndex = digits.findIndex((d) => !d);
      const targetIndex = firstEmptyIndex !== -1 ? firstEmptyIndex : 0;
      inputRefs.current[targetIndex]?.focus();
    }
  }, [autoFocus, disabled]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateOtp(newDigits: string[]) {
    // Reconstruct the trimmed OTP string from the array of digits
    let result = "";
    for (let i = 0; i < length; i++) {
      result += newDigits[i] ?? "";
    }
    onChange?.(result);

    if (result.length === length && !result.includes(" ")) {
      onComplete?.(result);
    }
    return result;
  }

  function handleChange(
    index: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const raw = event.target.value;
    const numeric = raw.replace(/\D/g, "");

    // When pasting or mobile auto-filling multiple digits into a single change event
    if (numeric.length > 1) {
      const sliced = numeric.slice(0, length);
      const newDigits = Array.from({ length }, (_, i) => sliced[i] ?? "");
      const res = updateOtp(newDigits);
      if (res.length === length) {
        inputRefs.current[length - 1]?.focus();
      } else {
        const lastIdx = Math.max(0, res.length - 1);
        inputRefs.current[lastIdx]?.focus();
      }
      return;
    }

    const char = numeric.slice(-1) || "";
    const newDigits = [...digits];
    newDigits[index] = char;
    updateOtp(newDigits);

    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace") {
      if (!digits[index]) {
        // Current box is already empty; move back and clear the previous box
        if (index > 0) {
          event.preventDefault();
          const newDigits = [...digits];
          newDigits[index - 1] = "";
          updateOtp(newDigits);
          inputRefs.current[index - 1]?.focus();
        }
      } else {
        // Current box has content; clear it and keep focus
        event.preventDefault();
        const newDigits = [...digits];
        newDigits[index] = "";
        updateOtp(newDigits);
      }
    } else if (event.key === "Delete") {
      event.preventDefault();
      const newDigits = [...digits];
      newDigits[index] = "";
      updateOtp(newDigits);
    } else if (event.key === "ArrowLeft") {
      if (index > 0) {
        event.preventDefault();
        inputRefs.current[index - 1]?.focus();
      }
    } else if (event.key === "ArrowRight") {
      if (index < length - 1) {
        event.preventDefault();
        inputRefs.current[index + 1]?.focus();
      }
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasteText = event.clipboardData.getData("text");
    const numeric = pasteText.replace(/\D/g, "");
    if (!numeric) return;

    // Fill from the first OTP box and limit to `length` digits
    const sliced = numeric.slice(0, length);
    const newDigits = Array.from({ length }, (_, i) => sliced[i] ?? "");
    const res = updateOtp(newDigits);

    // Focus the last populated digit
    const focusIndex = Math.max(0, Math.min(res.length - 1, length - 1));
    inputRefs.current[focusIndex]?.focus();
  }

  function handleFocus(event: React.FocusEvent<HTMLInputElement>) {
    event.target.select();
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "flex items-center justify-between gap-2 sm:gap-3",
        className,
      )}
    >
      {Array.from({ length }).map((_, index) => {
        const inputId = `${id}-${index}`;
        return (
          <input
            key={inputId}
            id={inputId}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete="one-time-code"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-label={`Digit ${index + 1} of ${length}`}
            value={digits[index] || ""}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={handleFocus}
            className={cn(
              // eslint-disable-next-line tailwindcss/no-arbitrary-value
              "flex size-12 items-center justify-center rounded-lg border border-input bg-background text-center text-lg font-semibold text-foreground shadow-sm transition-colors duration-[var(--duration-fast)] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/15 sm:size-12 sm:text-xl",
              inputClassName,
            )}
          />
        );
      })}
    </div>
  );
}
