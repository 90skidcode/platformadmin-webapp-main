"use client";

import { useTranslations } from "next-intl";

import { TableRenderer } from "@/components/table";
import {
  auditLogsTableSchema,
  type AuditLogRow,
} from "@/schemas/tables/audit-logs-table";

export default function AuditLogsPage() {
  const commonT = useTranslations("common");
  const t = useTranslations("tables.auditLogs");

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          {commonT("nav.auditLogs")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <TableRenderer<AuditLogRow> schema={auditLogsTableSchema} />
    </div>
  );
}
