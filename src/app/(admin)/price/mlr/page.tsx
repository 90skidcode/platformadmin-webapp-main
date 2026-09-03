"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";

import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui";
import { FormRenderer } from "@/components/form";
import { TableRenderer } from "@/components/table";
import { apiEndpoints } from "@/lib/api-endpoints";
import { parseApiErrorMessage } from "@/lib/api-envelope";
import { useApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import { mlrTableSchema } from "@/schemas/tables/price/mlr-table";
import {
  createMlrFormSchema,
  editMlrFormSchema,
} from "@/schemas/forms/price/mlr-form";

interface MlrRow {
  [key: string]: unknown;
  vehicle_type_id: number;
  brand_id: number;
  lms_id: string;
  name: string;
  lms_name: string;
  provider_name: string;
  status: string;
  rate_3y: number;
  rate_4y: number;
  rate_5y: number;
  rate_6y: number;
  rate_7y: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export default function MlrPage() {
  const { data: session } = useSession();
  const apiFetcher = useApiFetcher();
  const t = useTranslations("tables.mlr");
  const [addOpen, setAddOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<MlrRow | null>(null);
  const [tableKey, setTableKey] = useState(0);
  const refreshTable = () => setTableKey((k) => k + 1);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">
          MLR (Minimum Lending Rate)
        </h2>
        <p className="text-sm text-muted-foreground">
          View and manage MLR pricing configurations, tenure rates, and status.
        </p>
      </div>

      <TableRenderer<MlrRow>
        key={tableKey}
        schema={mlrTableSchema}
        actionHandlers={{
          editMlr: async (row) => setEditingRow(row as MlrRow),
        }}
        toolbarEnd={
          !!session && (
            <Button onClick={() => setAddOpen(true)}>
              <Plus />
              {t("actions.newMlr")}
            </Button>
          )
        }
      />

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t("dialog.newTitle")}</SheetTitle>
          </SheetHeader>
          <FormRenderer
            schema={createMlrFormSchema}
            onRefetch={refreshTable}
            actionHandlers={{
              createMlr: async (values) => {
                const res = await apiFetcher(apiEndpoints.price.mlr.list, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(values),
                });
                if (!res.ok) {
                  const body = await res.json().catch(() => null);
                  throw new Error(parseApiErrorMessage(body, res.status));
                }
                setAddOpen(false);
              },
            }}
          />
        </SheetContent>
      </Sheet>

      <Sheet
        open={!!editingRow}
        onOpenChange={(open) => !open && setEditingRow(null)}
      >
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editingRow
                ? t("dialog.editTitle", { name: editingRow.name })
                : ""}
            </SheetTitle>
          </SheetHeader>
          {editingRow && (
            <FormRenderer
              schema={editMlrFormSchema}
              defaultValues={{ ...editingRow }}
              onRefetch={refreshTable}
              actionHandlers={{
                saveMlr: async (values) => {
                  const res = await apiFetcher(
                    apiEndpoints.price.mlr.byId(editingRow.lms_id),
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(values),
                    },
                  );
                  if (!res.ok) {
                    const body = await res.json().catch(() => null);
                    throw new Error(parseApiErrorMessage(body, res.status));
                  }
                  setEditingRow(null);
                },
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
