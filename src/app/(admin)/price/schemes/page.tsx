"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui";
import { TableRenderer } from "@/components/table";
import { apiEndpoints } from "@/lib/api-endpoints";
import { parseApiErrorMessage } from "@/lib/api-envelope";
import { useApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import { schemesTableSchema } from "@/schemas/tables/price/schemes-table";

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
  const t = useTranslations("tables.schemes");
  const apiFetcher = useApiFetcher();
  const [tableKey, setTableKey] = useState(0);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<SchemesRow | null>(null);
  const [formData, setFormData] = useState<Partial<SchemesRow>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refreshTable = () => setTableKey((k) => k + 1);

  function handleOpenAdd() {
    setFormData({
      scheme_id: undefined,
      scheme_description: "",
      new_used: "NEW",
      vehicle_type: "4W",
      scheme_group: 1,
      status: "active",
    });
    setFormError(null);
    setIsAddOpen(true);
  }

  function handleOpenEdit(row: SchemesRow) {
    setEditingRow(row);
    setFormData({ ...row });
    setFormError(null);
  }

  async function handleSave(isEdit: boolean) {
    setSaving(true);
    setFormError(null);
    try {
      const url =
        isEdit && editingRow
          ? apiEndpoints.price.schemes.byId(editingRow.scheme_id)
          : apiEndpoints.price.schemes.list;
      const method = isEdit ? "PUT" : "POST";

      const res = await apiFetcher(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(parseApiErrorMessage(body, res.status));
      }

      setIsAddOpen(false);
      setEditingRow(null);
      refreshTable();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : t("toast.genericError"),
      );
    } finally {
      setSaving(false);
    }
  }

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
          editScheme: async (row) => handleOpenEdit(row as SchemesRow),
        }}
        toolbarEnd={
          <Button onClick={handleOpenAdd}>
            <Plus className="size-4" />
            {t("actions.newScheme")}
          </Button>
        }
      />

      {/* Add / Edit Drawer */}
      <Sheet
        open={isAddOpen || !!editingRow}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditingRow(null);
          }
        }}
      >
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editingRow
                ? t("dialog.editTitle", { name: editingRow.scheme_description })
                : t("dialog.newTitle")}
            </SheetTitle>
          </SheetHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave(!!editingRow);
            }}
            className="flex flex-col gap-4 py-4"
          >
            {formError && (
              <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {formError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scheme-description">
                {t("columns.scheme_description")}
              </Label>
              <Input
                id="scheme-description"
                required
                value={formData.scheme_description ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    scheme_description: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="scheme-id">{t("columns.scheme_id")}</Label>
                <Input
                  id="scheme-id"
                  type="number"
                  required
                  disabled={!!editingRow}
                  value={formData.scheme_id ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      scheme_id: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="scheme-group">
                  {t("columns.scheme_group")}
                </Label>
                <Input
                  id="scheme-group"
                  type="number"
                  value={formData.scheme_group ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      scheme_group: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="scheme-new-used">{t("columns.new_used")}</Label>
                <Select
                  value={formData.new_used ?? "NEW"}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, new_used: val }))
                  }
                >
                  <SelectTrigger id="scheme-new-used">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="USED">Used</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="scheme-vehicle-type">
                  {t("columns.vehicle_type")}
                </Label>
                <Select
                  value={formData.vehicle_type ?? "4W"}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, vehicle_type: val }))
                  }
                >
                  <SelectTrigger id="scheme-vehicle-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2W">2 Wheeler</SelectItem>
                    <SelectItem value="4W">4 Wheeler</SelectItem>
                    <SelectItem value="CV">Commercial Vehicle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scheme-status">{t("columns.status")}</Label>
              <Select
                value={formData.status ?? "active"}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, status: val }))
                }
              >
                <SelectTrigger id="scheme-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("status.active")}</SelectItem>
                  <SelectItem value="inactive">
                    {t("status.inactive")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <SheetFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingRow(null);
                }}
              >
                {t("actions.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : t("actions.save")}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
