import { Badge, type BadgeProps } from "@/components/ui";
import type { TableColumn } from "./types";

function formatDate(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Dispatches on `column.cell` (plan §18's registry-pattern note: a new
 * cell type is a new branch here, not a growing component). */
export function renderCell(
  column: TableColumn,
  value: unknown,
): React.ReactNode {
  switch (column.cell) {
    case "date":
      return formatDate(value);
    case "email":
      return value ? (
        <a href={`mailto:${value}`} className="text-primary hover:underline">
          {String(value)}
        </a>
      ) : null;
    case "badge": {
      const key = String(value);
      const variant = (column.badgeVariants?.[key] ??
        "default") as BadgeProps["variant"];

      const label = column.badgeLabel?.[key] ?? key;

      return value !== null && value !== undefined ? (
        <Badge variant={variant}>{label}</Badge>
      ) : null;
    }
    default:
      return value == null ? "" : String(value);
  }
}
