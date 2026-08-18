"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { TableRenderer } from "@/components/table";
import { auditLogTableSchema } from "@/schemas/tables/audit-log-table";

interface AuditLogRow {
  [key: string]: unknown;
  id: string;
  actor: string;
  action: string;
  entity: string;
  timestamp: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

/** Read-only, server-mode table (plan §12) -- no row mutation actions at
 * all, "View" just opens a before/after diff. Cheapest of the three
 * Platform Admin screens for exactly that reason. */
export default function AuditLogPage() {
  const t = useTranslations("tables.auditLog");
  const commonT = useTranslations("common");
  const [viewing, setViewing] = useState<AuditLogRow | null>(null);

  return (
    <div className="flex flex-col gap-4 p-6">
      <h2 className="text-xl font-semibold tracking-tight">
        {commonT("nav.auditLog")}
      </h2>

      <TableRenderer<AuditLogRow>
        schema={auditLogTableSchema}
        actionHandlers={{
          viewEntry: async (row) => setViewing(row as AuditLogRow),
        }}
      />

      <Dialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialog.title")}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="mb-1 text-sm font-medium text-muted-foreground">
                  {t("dialog.before")}
                </h4>
                <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(viewing.before ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="mb-1 text-sm font-medium text-muted-foreground">
                  {t("dialog.after")}
                </h4>
                <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(viewing.after ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
