import type { UseFormReturn } from "react-hook-form";

/**
 * Plan §9: one shared registry type for both engines. `FormActions` and
 * `TableRenderer`'s row/bulk action execution both resolve `action.onClick`
 * against this same shape, apply `confirm` (via AlertDialog) and
 * `permission` (via `can()`) identically -- same mental model, same prop
 * shape, whether it's a form button or a table row action.
 */
export type ActionHandlers = Record<
  string,
  (
    values: unknown,
    ctx: { formApi?: UseFormReturn; row?: unknown },
  ) => void | Promise<void>
>;
