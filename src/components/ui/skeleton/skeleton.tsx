import * as React from "react";

import { cn } from "@/lib/utils/cn";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

/** Decorative loading placeholder -- a pulsing bar/block, sized entirely via
 * `className` (`h-4 w-3/4`, `size-4 rounded-full`, ...) same as Spinner.
 * `aria-hidden` since it's purely visual; the loading state itself should be
 * announced once by the container (e.g. `aria-busy`), not per-skeleton. */
export function Skeleton({ className, ...props }: Readonly<SkeletonProps>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}
