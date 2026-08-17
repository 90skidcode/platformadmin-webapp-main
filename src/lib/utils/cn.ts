import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges conditional class names (via `clsx`) and then resolves conflicting
 * Tailwind utility classes (via `tailwind-merge`) so later classes win over
 * earlier ones instead of both being emitted. Every primitive in
 * `components/ui` accepts a `className` prop that passes through this.
 */
export function cn(...inputs: ClassValue[]) {
  // eslint-disable-next-line tailwindcss/no-custom-classname -- false positive: `inputs` is this function's own parameter name, not a classname literal; the plugin flags `cn(...)`'s definition as if it were a call to itself.
  return twMerge(clsx(inputs));
}
