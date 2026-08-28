"use client";

import { useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Header,
  type Row,
  type RowSelectionState,
  type Table,
} from "@tanstack/react-table";
import { useVirtualizer, type Virtualizer } from "@tanstack/react-virtual";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ArrowUpDown, ListFilter, X } from "lucide-react";

import {
  Badge,
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Skeleton,
} from "@/components/ui";
import { useApiFetcher, type ApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import { resolveText } from "../form/fields/field-label";
import { BulkActionsBar } from "./bulk-actions-bar";
import { renderCell } from "./cell-renderers";
import { RowActionsCell } from "./row-actions-cell";
import { TablePagination } from "./table-pagination";
import { useTableData } from "./use-table-data";
import type { ActionHandlers, TableSchema } from "./types";

/** Rows shown while a fetch (initial load, page/sort/filter change) is in
 * flight -- a fixed count rather than `pageSize` so a table configured for
 * a small page size doesn't look sparse mid-load. */
const SKELETON_ROW_COUNT = 10;

/** `__select`/`__actions` get a control-sized placeholder; every real data
 * column gets a text-sized bar. */
function renderSkeletonCell(columnId: string) {
  if (columnId === "__select") return <Skeleton className="size-4" />;
  if (columnId === "__actions") return <Skeleton className="ml-auto size-4" />;
  return <Skeleton className="h-4 w-3/4" />;
}

export interface TableRendererProps<T extends Record<string, unknown>> {
  schema: TableSchema;
  /** Client mode only -- omit to fetch from `schema.endpoint` instead. */
  data?: T[];
  actionHandlers?: ActionHandlers;
  /** Defaults to `useApiFetcher()` -- tests inject a mock without touching context providers (plan §6.3). */
  apiFetcher?: ApiFetcher;
  /** Rendered at the right end of the toolbar row, alongside search/filters
   * (search left, filter + this on the right) -- e.g. a page's "+ New"
   * button. Page-specific, so it's a slot rather than a schema concept. */
  toolbarEnd?: React.ReactNode;
}

/** The JSON-driven table engine (plan §7.2/§9): `schema` in, a sortable,
 * searchable, paginated table -- with row/bulk actions, confirm dialogs, and
 * permission gates -- out. */
export function TableRenderer<T extends Record<string, unknown>>({
  schema,
  data,
  actionHandlers = {},
  apiFetcher,
  toolbarEnd,
}: Readonly<TableRendererProps<T>>) {
  const fallbackFetcher = useApiFetcher();
  const fetcher = apiFetcher ?? fallbackFetcher;
  const translate = useTranslations(schema.i18nNamespace);
  const commonT = useTranslations("common");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  // Draft filter values edited in the sheet -- kept separate from the
  // applied `filters` below so Submit/Clear each pick when the table
  // actually re-filters/re-fetches, instead of every keystroke doing it.
  const [pendingFilters, setPendingFilters] = useState<Record<string, string>>(
    {},
  );

  const {
    rows,
    total,
    loading,
    pageIndex,
    pageSize,
    setPageIndex,
    sorting,
    setSorting,
    search,
    setSearch,
    filters,
    setFilter,
    refetch,
  } = useTableData(schema, data, fetcher);

  function openFilterSheet() {
    setPendingFilters(filters);
    setFilterSheetOpen(true);
  }

  function submitFilters() {
    for (const filter of schema.filters ?? []) {
      setFilter(filter.accessorKey, pendingFilters[filter.accessorKey] ?? "");
    }
    setFilterSheetOpen(false);
  }

  function clearFilters() {
    setPendingFilters({});
    for (const filter of schema.filters ?? []) {
      setFilter(filter.accessorKey, "");
    }
  }

  const activeFilterCount = Object.keys(filters).length;

  const columns = useMemo<ColumnDef<T>[]>(() => {
    const cols: ColumnDef<T>[] = [];

    if (schema.selectable) {
      cols.push({
        id: "__select",
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all rows"
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label="Select row"
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
          />
        ),
        enableSorting: false,
        size: 32,
      });
    }

    for (const column of schema.columns) {
      cols.push({
        id: column.accessorKey,
        accessorKey: column.accessorKey,
        header: () =>
          resolveText(translate, column.header, column.headerKey) ??
          column.accessorKey,
        cell: ({ getValue, row }) =>
          renderCell(column, getValue(), row.original),
        enableSorting: !!column.sortable,
        size: column.width ? Number(column.width) : undefined,
      });
    }

    if (schema.rowActions?.length) {
      cols.push({
        id: "__actions",
        header: () => null,
        cell: ({ row }) => (
          <RowActionsCell
            actions={schema.rowActions!}
            row={row.original}
            actionHandlers={actionHandlers}
            apiFetcher={fetcher}
            translate={translate}
            refetch={refetch}
          />
        ),
        enableSorting: false,
      });
    }

    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- schema/actionHandlers/fetcher/translate/refetch are stable enough per render cycle for this to be safe; re-deriving every keystroke would be wasteful.
  }, [schema, translate]);

  // Virtualizing a page of 10 rows defeats the point -- virtualization
  // replaces pagination for client mode (scroll through everything instead
  // of paging), it doesn't nest inside it. Server mode + virtualize still
  // virtualizes whatever one page's worth of rows came back; a real
  // "infinite scroll, fetch as you go" mode is a bigger feature than this
  // perf pass covers.
  const clientVirtualize = schema.mode === "client" && !!schema.virtualize;

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, pagination: { pageIndex, pageSize }, rowSelection },
    manualPagination: schema.mode === "server",
    manualSorting: schema.mode === "server",
    pageCount:
      schema.mode === "server" ? Math.ceil(total / pageSize) : undefined,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(next);
    },
    onPaginationChange: (updater) => {
      const current = { pageIndex, pageSize };
      const next = typeof updater === "function" ? updater(current) : updater;
      setPageIndex(next.pageIndex);
    },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: !!schema.selectable,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel:
      schema.mode === "client" ? getSortedRowModel() : undefined,
    getPaginationRowModel:
      schema.mode === "client" && !clientVirtualize
        ? getPaginationRowModel()
        : undefined,
  });

  const searchEnabled = schema.search?.enabled !== false;
  const mobileCards = schema.display?.mobile === "cards";
  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);

  const virtualizeScrollRef = useRef<HTMLDivElement>(null);
  const bodyRows = table.getRowModel().rows;
  const virtualizeEnabled =
    !!schema.virtualize && !loading && bodyRows.length > 0;
  const rowVirtualizer = useVirtualizer({
    count: bodyRows.length,
    getScrollElement: () => virtualizeScrollRef.current,
    estimateSize: () => 41, // px -- matches the non-virtualized row's px-3 py-2 + text-sm line height
    overscan: 10,
    enabled: virtualizeEnabled,
  });

  function renderTableBody() {
    if (loading) {
      return Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIndex) => (
        <tr
          key={`skeleton-row-${rowIndex}`}
          className="border-b border-border last:border-0"
        >
          {columns.map((column) => (
            <td key={column.id} className="px-3 py-2">
              {renderSkeletonCell(column.id ?? "")}
            </td>
          ))}
        </tr>
      ));
    }
    if (table.getRowModel().rows.length === 0) {
      return (
        <tr>
          <td
            colSpan={columns.length}
            className="px-3 py-6 text-center text-muted-foreground"
          >
            {commonT("table.noResults")}
          </td>
        </tr>
      );
    }
    return table.getRowModel().rows.map((row) => (
      <tr
        key={row.id}
        className="border-b border-border last:border-0"
        data-state={row.getIsSelected() ? "selected" : undefined}
      >
        {row.getVisibleCells().map((cell) => (
          <td key={cell.id} className="px-3 py-2">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
    ));
  }

  return (
    <div className="flex flex-col gap-3">
      {(searchEnabled ||
        schema.filters?.length ||
        schema.bulkActions?.length ||
        toolbarEnd) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {searchEnabled && (
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  schema.search?.placeholderKey
                    ? translate(schema.search.placeholderKey)
                    : commonT("table.search")
                }
                className="max-w-xs"
                aria-label={commonT("table.search")}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {schema.bulkActions && (
              <BulkActionsBar
                actions={schema.bulkActions}
                selectedRows={selectedRows}
                actionHandlers={actionHandlers}
                apiFetcher={fetcher}
                translate={translate}
                refetch={refetch}
                onDone={() => setRowSelection({})}
              />
            )}
            {!!schema.filters?.length && activeFilterCount === 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={openFilterSheet}
                className="gap-2"
              >
                <ListFilter className="size-4" aria-hidden="true" />
                {commonT("table.filters")}
              </Button>
            )}
            {!!schema.filters?.length && activeFilterCount > 0 && (
              <div className="inline-flex h-10 items-center rounded-lg border border-border bg-background text-sm font-medium transition-colors">
                <button
                  type="button"
                  onClick={openFilterSheet}
                  className="inline-flex h-full items-center gap-2 rounded-l-lg px-3.5 hover:bg-accent hover:text-accent-foreground focus-visible:ring-4 focus-visible:ring-ring/20 focus-visible:outline-none"
                >
                  <ListFilter className="size-4" aria-hidden="true" />
                  {commonT("table.filters")}
                  <Badge
                    variant="secondary"
                    className="pointer-events-none px-1.5"
                  >
                    {activeFilterCount}
                  </Badge>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilters();
                  }}
                  aria-label={commonT("table.clearAllFilters")}
                  title={commonT("table.clearAllFilters")}
                  className="inline-flex h-full items-center justify-center rounded-r-lg border-l border-border px-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/20 focus-visible:outline-none"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
            {toolbarEnd}
          </div>
        </div>
      )}

      {!!schema.filters?.length && (
        <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{commonT("table.filters")}</SheetTitle>
              <SheetDescription>
                {commonT("table.filtersDescription")}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
              {schema.filters.map((filter) => {
                const filterLabel =
                  resolveText(translate, filter.label, filter.labelKey) ??
                  filter.accessorKey;
                const fieldId = `table-filter-${filter.accessorKey}`;
                return (
                  <div
                    key={filter.accessorKey}
                    className="flex flex-col gap-1.5"
                  >
                    <Label htmlFor={fieldId}>{filterLabel}</Label>
                    <Select
                      value={pendingFilters[filter.accessorKey] ?? ""}
                      onValueChange={(value) =>
                        setPendingFilters((current) => {
                          if (!value) {
                            const rest = { ...current };
                            delete rest[filter.accessorKey];
                            return rest;
                          }
                          return { ...current, [filter.accessorKey]: value };
                        })
                      }
                    >
                      <SelectTrigger id={fieldId} aria-label={filterLabel}>
                        <SelectValue
                          placeholder={commonT("table.allFilterOption", {
                            label: filterLabel,
                          })}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">
                          {commonT("table.allFilterOption", {
                            label: filterLabel,
                          })}
                        </SelectItem>
                        {filter.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {resolveText(
                              translate,
                              option.label,
                              option.labelKey,
                            ) ?? option.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={clearFilters}>
                {commonT("table.clearFilters")}
              </Button>
              <Button type="button" onClick={submitFilters}>
                {commonT("table.applyFilters")}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop / `scroll` mode. Hidden entirely under `display.mobile: "cards"`. */}
      {virtualizeEnabled ? (
        <VirtualizedTable
          table={table}
          rows={bodyRows}
          scrollRef={virtualizeScrollRef}
          virtualizer={rowVirtualizer}
          hiddenOnMobile={mobileCards}
          schema={schema}
        />
      ) : (
        <div
          className={`overflow-x-auto rounded-lg border border-border ${mobileCards ? "hidden md:block" : ""}`}
        >
          <table className="w-full text-sm" aria-busy={loading || undefined}>
            <thead className="border-b border-border bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-2 text-left font-medium text-muted-foreground"
                    >
                      <HeaderCell header={header} />
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>{renderTableBody()}</tbody>
          </table>
        </div>
      )}

      {/* `display.mobile: "cards"` -- a stacked card list, no horizontal scroll at all. CSS-toggled (`md:hidden`), not JS viewport detection, so it's correct on first paint. */}
      {mobileCards && (
        <div className="flex flex-col gap-3 md:hidden">
          {table.getRowModel().rows.map((row) => (
            <div key={row.id} className="rounded-lg border border-border p-3">
              {row.getVisibleCells().map((cell) => {
                if (
                  cell.column.id === "__select" ||
                  cell.column.id === "__actions"
                )
                  return null;
                return (
                  <div
                    key={cell.id}
                    className="flex items-center justify-between gap-2 py-1 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {typeof cell.column.columnDef.header === "function"
                        ? (
                            cell.column.columnDef
                              .header as () => React.ReactNode
                          )()
                        : cell.column.columnDef.header}
                    </span>
                    <span>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </span>
                  </div>
                );
              })}
              {schema.rowActions?.length && (
                <div className="mt-2 border-t border-border pt-2">
                  <RowActionsCell
                    actions={schema.rowActions}
                    row={row.original}
                    actionHandlers={actionHandlers}
                    apiFetcher={fetcher}
                    translate={translate}
                    refetch={refetch}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!clientVirtualize && (
        <TablePagination
          pageIndex={pageIndex}
          pageSize={pageSize}
          total={total}
          onPageChange={setPageIndex}
        />
      )}
    </div>
  );
}

function SortIcon({
  direction,
}: Readonly<{ direction: false | "asc" | "desc" }>) {
  if (direction === "asc")
    return <ArrowUp className="size-3.5" aria-hidden="true" />;
  if (direction === "desc")
    return <ArrowDown className="size-3.5" aria-hidden="true" />;
  return <ArrowUpDown className="size-3.5 opacity-40" aria-hidden="true" />;
}

function HeaderCell<T>({ header }: Readonly<{ header: Header<T, unknown> }>) {
  if (header.isPlaceholder) return null;
  if (!header.column.getCanSort()) {
    return flexRender(header.column.columnDef.header, header.getContext());
  }
  return (
    <button
      type="button"
      className="flex items-center gap-1"
      onClick={header.column.getToggleSortingHandler()}
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
      <SortIcon direction={header.column.getIsSorted()} />
    </button>
  );
}

/** `column.width` (schema-authored) or a fallback -- used as an explicit
 * flex-basis so the flex-laid-out virtualized rows line up with the
 * flex-laid-out header, since a virtualized body can't rely on native
 * `<table>` column-width negotiation (see the note on `VirtualizedTable`). */
function columnWidth(columnId: string, schema: TableSchema): string {
  if (columnId === "__select") return "40px";
  if (columnId === "__actions") return "120px";
  const column = schema.columns.find((c) => c.accessorKey === columnId);
  return column?.width ? `${column.width}px` : "180px";
}

interface VirtualizedTableProps<T extends Record<string, unknown>> {
  table: Table<T>;
  rows: Row<T>[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  hiddenOnMobile: boolean;
  schema: TableSchema;
}

/**
 * Row-virtualized alternative to the plain `<table>` above (plan §10).
 * Deliberately NOT a semantic `<table>`: native table layout negotiates
 * column widths across every row at once, which fights with only rendering
 * a virtualized window of rows -- the well-established workaround (used by
 * TanStack's own virtualization examples) is a flex/grid "table" instead,
 * with explicit per-column widths shared between header and body so they
 * still line up. `role="table"/"row"/"cell"` keeps it accessible.
 */
function VirtualizedTable<T extends Record<string, unknown>>({
  table,
  rows,
  scrollRef,
  virtualizer,
  hiddenOnMobile,
  schema,
}: Readonly<VirtualizedTableProps<T>>) {
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      role="table"
      className={`overflow-hidden rounded-lg border border-border ${hiddenOnMobile ? "hidden md:block" : ""}`}
    >
      <div role="rowgroup">
        {table.getHeaderGroups().map((headerGroup) => (
          <div
            key={headerGroup.id}
            role="row"
            className="flex border-b border-border bg-muted/50"
          >
            {headerGroup.headers.map((header) => (
              <div
                key={header.id}
                role="columnheader"
                className="shrink-0 overflow-hidden px-3 py-2 text-left text-sm font-medium text-ellipsis text-muted-foreground"
                style={{
                  width: schema
                    ? columnWidth(header.column.id, schema)
                    : undefined,
                }}
              >
                <HeaderCell header={header} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div ref={scrollRef} className="overflow-auto" style={{ height: 480 }}>
        <div
          role="rowgroup"
          style={{ height: virtualizer.getTotalSize(), position: "relative" }}
        >
          {virtualItems.map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <div
                key={row.id}
                role="row"
                data-state={row.getIsSelected() ? "selected" : undefined}
                className="absolute top-0 left-0 flex w-full border-b border-border data-[state=selected]:bg-accent"
                style={{
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    role="cell"
                    className="shrink-0 overflow-hidden px-3 py-2 text-sm text-ellipsis"
                    style={{
                      width: schema
                        ? columnWidth(cell.column.id, schema)
                        : undefined,
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
