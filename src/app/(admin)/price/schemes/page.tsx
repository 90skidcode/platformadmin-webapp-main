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
import { schemesTableSchema } from "@/schemas/tables/price/schemes-table";
import {
  createSchemeFormSchema,
  editSchemeFormSchema,
} from "@/schemas/forms/price/schemes-form";

interface SchemesRow {
  [key: string]: unknown;
  scheme_id: number;
  scheme_description: string;
  new_used: string;
  vehicle_type: string;
  scheme_group: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export default function SchemesPage() {
  const { data: session } = useSession();
  const apiFetcher = useApiFetcher();
  const t = useTranslations("tables.schemes");
  const [addOpen, setAddOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<SchemesRow | null>(null);
  const [tableKey, setTableKey] = useState(0);
  const refreshTable = () => setTableKey((k) => k + 1);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">Price Schemes</h2>
        <p className="text-sm text-muted-foreground">
          View and manage pricing schemes by vehicle type, condition, group, and
          status.
        </p>
      </div>

      <TableRenderer<SchemesRow>
        key={tableKey}
        schema={schemesTableSchema}
        actionHandlers={{
          editScheme: async (row) => setEditingRow(row as SchemesRow),
        }}
        toolbarEnd={
          !!session && (
            <Button onClick={() => setAddOpen(true)}>
              <Plus />
              {t("actions.newScheme")}
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
            schema={createSchemeFormSchema}
            onRefetch={refreshTable}
            actionHandlers={{
              createScheme: async (values) => {
                const res = await apiFetcher(apiEndpoints.price.schemes.list, {
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
                ? t("dialog.editTitle", { name: editingRow.scheme_description })
                : ""}
            </SheetTitle>
          </SheetHeader>
          {editingRow && (
            <FormRenderer
              schema={editSchemeFormSchema}
              defaultValues={{ ...editingRow }}
              onRefetch={refreshTable}
              actionHandlers={{
                saveScheme: async (values) => {
                  const res = await apiFetcher(
                    apiEndpoints.price.schemes.byId(editingRow.scheme_id),
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
