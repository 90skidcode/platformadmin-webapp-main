import * as React from "react";

import { cn } from "@/lib/utils/cn";

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  /** Sizing/color are just Tailwind classes (`size-4`, `text-primary`, ...) --
   * the spinner draws in `currentColor`, same as the rest of this icon set. */
  className?: string;
}

/** The loading indicator used everywhere a spinner is needed (Button's
 * `loading` state, page-level "Loading..." states, ...) -- one shared visual
 * instead of ad-hoc `animate-spin` divs. A ring at 25% opacity plus one
 * solid quarter-arc, rotating -- reads clearly at any size without needing a
 * dedicated "track" color token. */
export const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-4 animate-spin", className)}
      aria-hidden="true"
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        className="opacity-25"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  ),
);
Spinner.displayName = "Spinner";
