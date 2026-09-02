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
import { mlrTableSchema } from "@/schemas/tables/price/mlr-table";

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
  const t = useTranslations("tables.mlr");
  const apiFetcher = useApiFetcher();
  const [tableKey, setTableKey] = useState(0);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<MlrRow | null>(null);
  const [formData, setFormData] = useState<Partial<MlrRow>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refreshTable = () => setTableKey((k) => k + 1);

  function handleOpenAdd() {
    setFormData({
      vehicle_type_id: 1,
      brand_id: 101,
      lms_id: "",
      name: "",
      lms_name: "",
      provider_name: "CARWALE",
      status: "active",
      rate_3y: 8.5,
      rate_4y: 8.75,
      rate_5y: 9.0,
      rate_6y: 9,
      rate_7y: 9.5,
    });
    setFormError(null);
    setIsAddOpen(true);
  }

  function handleOpenEdit(row: MlrRow) {
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
          ? apiEndpoints.price.mlr.byId(editingRow.lms_id)
          : apiEndpoints.price.mlr.list;
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
        <h2 className="text-xl font-semibold tracking-tight">MLR</h2>
        <p className="text-sm text-muted-foreground">
          View and manage MLR pricing configurations, tenure rates, and status.
        </p>
      </div>

      <TableRenderer<MlrRow>
        key={tableKey}
        schema={mlrTableSchema}
        actionHandlers={{
          editMlr: async (row) => handleOpenEdit(row as MlrRow),
        }}
        toolbarEnd={
          <Button onClick={handleOpenAdd}>
            <Plus className="size-4" />
            {t("actions.newMlr")}
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
                ? t("dialog.editTitle", { name: editingRow.name })
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
              <Label htmlFor="mlr-name">{t("columns.name")}</Label>
              <Input
                id="mlr-name"
                required
                value={formData.name ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mlr-lms-id">{t("columns.lms_id")}</Label>
                <Input
                  id="mlr-lms-id"
                  required
                  value={formData.lms_id ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, lms_id: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mlr-lms-name">{t("columns.lms_name")}</Label>
                <Input
                  id="mlr-lms-name"
                  value={formData.lms_name ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lms_name: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mlr-provider">
                  {t("columns.provider_name")}
                </Label>
                <Input
                  id="mlr-provider"
                  value={formData.provider_name ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      provider_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mlr-status">{t("columns.status")}</Label>
                <Select
                  value={formData.status ?? "active"}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, status: val }))
                  }
                >
                  <SelectTrigger id="mlr-status">
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mlr-vehicle-type-id">
                  {t("columns.vehicle_type_id")}
                </Label>
                <Input
                  id="mlr-vehicle-type-id"
                  type="number"
                  value={formData.vehicle_type_id ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      vehicle_type_id: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mlr-brand-id">{t("columns.brand_id")}</Label>
                <Input
                  id="mlr-brand-id"
                  type="number"
                  value={formData.brand_id ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      brand_id: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Tenure Rates
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="rate-3y" className="text-xs">
                    {t("columns.rate_3y")}
                  </Label>
                  <Input
                    id="rate-3y"
                    type="number"
                    step="0.01"
                    value={formData.rate_3y ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        rate_3y: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="rate-4y" className="text-xs">
                    {t("columns.rate_4y")}
                  </Label>
                  <Input
                    id="rate-4y"
                    type="number"
                    step="0.01"
                    value={formData.rate_4y ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        rate_4y: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="rate-5y" className="text-xs">
                    {t("columns.rate_5y")}
                  </Label>
                  <Input
                    id="rate-5y"
                    type="number"
                    step="0.01"
                    value={formData.rate_5y ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        rate_5y: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="rate-6y" className="text-xs">
                    {t("columns.rate_6y")}
                  </Label>
                  <Input
                    id="rate-6y"
                    type="number"
                    value={formData.rate_6y ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        rate_6y: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="rate-7y" className="text-xs">
                    {t("columns.rate_7y")}
                  </Label>
                  <Input
                    id="rate-7y"
                    type="number"
                    step="0.01"
                    value={formData.rate_7y ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        rate_7y: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
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
