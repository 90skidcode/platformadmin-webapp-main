import { formatDateIso } from "@/components/ui/date-range-picker/date-utils";
import type { FormField, FormFieldType, FormSchema } from "../form/types";
import type { TableFilter } from "./types";

export function getDateParamKeys(field: FormField) {
  const fromParamName = (field as { fromParamName?: string }).fromParamName;
  const toParamName = (field as { toParamName?: string }).toParamName;
  return {
    fromKey:
      fromParamName ??
      (field.name === "date_range" ? "from_date" : `${field.name}_from`),
    toKey:
      toParamName ??
      (field.name === "date_range" ? "to_date" : `${field.name}_to`),
  };
}

export function buildFilterDefaults(
  fields: FormField[] | undefined,
  filters: Record<string, string>,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const field of fields ?? []) {
    if (field.type === "date-range") {
      const { fromKey, toKey } = getDateParamKeys(field);
      defaults[field.name] = {
        from: filters[fromKey] ?? null,
        to: filters[toKey] ?? null,
      };
    } else {
      defaults[field.name] = filters[field.name] ?? "";
    }
  }
  return defaults;
}

function toIsoDateString(val: Date | string | null | undefined): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  return formatDateIso(val);
}

function applyDateRangeFilter(
  field: FormField,
  val: unknown,
  setFilter: (key: string, value: string) => void,
) {
  const { fromKey, toKey } = getDateParamKeys(field);
  const range =
    val && typeof val === "object"
      ? (val as { from?: Date | string | null; to?: Date | string | null })
      : null;
  setFilter(fromKey, toIsoDateString(range?.from));
  setFilter(toKey, toIsoDateString(range?.to));
}

export function applyFilterValues(
  fields: FormField[],
  rawValues: unknown,
  setFilter: (key: string, value: string) => void,
) {
  const values = (rawValues ?? {}) as Record<string, unknown>;
  for (const field of fields) {
    const val = values[field.name];
    if (field.type === "date-range") {
      applyDateRangeFilter(field, val, setFilter);
    } else {
      setFilter(field.name, (val as string) ?? "");
    }
  }
}

export function resolveFiltersToFormSchema(
  filters: TableFilter[] | undefined,
  tableId: string,
  i18nNamespace: string = "common",
  commonT: (key: string) => string,
): FormSchema | null {
  if (!filters?.length) return null;
  const fields: FormField[] = filters.map((filter) => ({
    name: filter.accessorKey,
    type: (filter.type ?? "select") as FormFieldType,
    label: filter.label,
    labelKey: filter.labelKey,
    placeholder: filter.placeholder,
    placeholderKey: filter.placeholderKey,
    optionsSource: filter.options
      ? { type: "static", options: filter.options }
      : undefined,
    minDate: filter.minDate ? String(filter.minDate) : undefined,
    maxDate: filter.maxDate ? String(filter.maxDate) : undefined,
    disablePast: filter.disablePast,
    disableFuture: filter.disableFuture,
    hidePastDates: filter.hidePastDates,
  }));

  return {
    id: `${tableId}-filter-form`,
    i18nNamespace,
    fields,
    actions: [
      {
        id: "clear",
        type: "button",
        label: commonT("table.clearFilters"),
        variant: "outline",
        onClick: "clearFilters",
      },
      {
        id: "apply",
        type: "submit",
        label: commonT("table.applyFilters"),
        onClick: "applyFilters",
      },
    ],
  };
}
