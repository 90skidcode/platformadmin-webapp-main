import Link from "next/link";
import { Badge, type BadgeProps } from "@/components/ui";
import { formatDate } from "@/lib/utils/format";
import { JsonViewerCell } from "./json-viewer-cell";
import type { TableColumn } from "./types";

/** Dispatches on `column.cell` (plan §18's registry-pattern note: a new
 * cell type is a new branch here, not a growing component). */
export function renderCell(
  column: TableColumn,
  value: unknown,
  row?: Record<string, unknown>,
): React.ReactNode {
  let resolvedValue = value;
  if (
    resolvedValue == null &&
    (column.cell === "date" ||
      column.cell === "datetime" ||
      column.cell === "timestamp" ||
      column.accessorKey === "created_at" ||
      column.accessorKey === "timestamp")
  ) {
    resolvedValue =
      row?.timestamp ?? row?.created_at ?? row?.createdAt ?? row?.time;
  }

  if (resolvedValue == null && column.accessorKey === "actor") {
    resolvedValue =
      row?.actor ??
      row?.actor_email ??
      row?.actor_id ??
      row?.email ??
      row?.user;
  }

  switch (column.cell) {
    case "date":
      return formatDate(resolvedValue as string | Date);
    case "datetime":
    case "timestamp":
      return formatDate(resolvedValue as string | Date, { includeTime: true });
    case "email":
      return resolvedValue ? (
        <a
          href={`mailto:${resolvedValue}`}
          className="text-primary hover:underline"
        >
          {String(resolvedValue)}
        </a>
      ) : null;
    case "badge": {
      const variant = (column.badgeVariants?.[String(resolvedValue)] ??
        "default") as BadgeProps["variant"];
      return resolvedValue ? (
        <Badge variant={variant}>{String(resolvedValue)}</Badge>
      ) : null;
    }
    case "link": {
      if (!resolvedValue) return "";
      const href = column.linkTemplate
        ? column.linkTemplate.replace(/\{(\w+)\}/g, (_, k) =>
            String(row?.[k] ?? ""),
          )
        : `/role-manager/${row?.id ?? resolvedValue}`;
      return (
        <Link
          href={href}
          className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
        >
          {String(resolvedValue)}
        </Link>
      );
    }
    case "json":
      return <JsonViewerCell row={row} value={value} />;
    default:
      return resolvedValue == null ? "" : String(resolvedValue);
  }
}
