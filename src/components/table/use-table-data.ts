"use client";

import { useEffect, useMemo, useState } from "react";
import type { SortingState } from "@tanstack/react-table";

import type { ApiEnvelope, ApiListData } from "@/lib/api-envelope";
import type { ApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import type { TableSchema } from "./types";

const EMPTY_ROWS: Record<string, unknown>[] = [];
const EMPTY_FILTERS: Record<string, string> = {};

export interface UseTableDataResult<T> {
  rows: T[];
  total: number;
  loading: boolean;
  error: boolean;
  pageIndex: number;
  limit: number;
  setPageIndex: (index: number) => void;
  sorting: SortingState;
  setSorting: (sorting: SortingState) => void;
  search: string;
  setSearch: (value: string) => void;
  /** Column accessorKey -> selected filter value; a key is absent (not
   * `""`) once cleared, so it never gets sent as a query param. */
  filters: Record<string, string>;
  setFilter: (accessorKey: string, value: string) => void;
  refetch: () => void;
}

/**
 * `client` mode (plan §3): fetched once (or given via `data`), then every
 * sort/search/filter/page change is handled in the browser by @tanstack/react-table.
 * `server` mode (plan §4): every sort/search/filter/page change re-fetches through
 * the BFF proxy, expecting the API-Standards-Guide envelope with
 * `data: { items, pagination }` (the mock backend's `toListData()` shape).
 * Each filter's `accessorKey` doubles
 * as its query-param name -- `paginate()` treats every non-reserved param
 * as an exact-match filter, so this needs no per-filter backend wiring.
 */
export function useTableData<T extends Record<string, unknown>>(
  schema: TableSchema,
  staticData: T[] | undefined,
  apiFetcher: ApiFetcher,
): UseTableDataResult<T> {
  const limit = schema.limit ?? schema.pageSize ?? 10;

  const [allRows, setAllRows] = useState<T[]>(
    staticData ?? (EMPTY_ROWS as T[]),
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(
    schema.mode === "server" || (!staticData && !!schema.endpoint),
  );
  const [error, setError] = useState(false);
  const [refetchToken, setRefetchToken] = useState(0);
  const [serverTotal, setServerTotal] = useState(0);

  const sortBy = sorting[0]?.id;
  const sortDir = sorting[0]?.desc ? "desc" : "asc";
  // Only server mode's page/search/filters should trigger a refetch --
  // client mode handles all three in the browser (see `clientFiltered`
  // below). Named here, not inlined in the deps array, so the dependency
  // list stays staticly checkable.
  const serverPageIndex = schema.mode === "server" ? pageIndex : 0;
  const serverSearch = schema.mode === "server" ? search : "";
  const serverFiltersKey =
    schema.mode === "server" ? JSON.stringify(filters) : "";

  useEffect(() => {
    if (schema.mode === "client" && staticData) return; // static data, nothing to fetch
    if (!schema.endpoint) return;

    let cancelled = false;
    setLoading(true);
    setError(false);

    const params = new URLSearchParams();
    if (schema.mode === "server") {
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(limit));
      if (search) params.set("search", search);
      if (sortBy) {
        params.set("sortBy", sortBy);
        params.set("sortDir", sortDir);
      }
      for (const [key, value] of Object.entries(filters)) {
        if (value) params.set(key, value);
      }
    }
    const url = params.size
      ? `${schema.endpoint.url}?${params}`
      : schema.endpoint.url;

    apiFetcher(url)
      .then((res) => res.json())
      .then((body: ApiEnvelope<ApiListData<T> | T[]>) => {
        if (cancelled) return;
        const { data } = body;
        if (Array.isArray(data)) {
          setAllRows(data);
          setServerTotal(data.length);
        } else {
          setAllRows(data.items);
          setServerTotal(data.pagination.totalItems);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately scoped: refetch only on the inputs that should trigger one.
  }, [
    schema.mode,
    schema.endpoint?.url,
    serverPageIndex,
    serverSearch,
    serverFiltersKey,
    sortBy,
    sortDir,
    refetchToken,
  ]);

  const clientFiltered = useMemo(() => {
    if (schema.mode !== "client") return allRows;
    let result = allRows;
    if (search) {
      const needle = search.toLowerCase();
      result = result.filter((row) =>
        schema.columns.some((col) =>
          String(row[col.accessorKey] ?? "")
            .toLowerCase()
            .includes(needle),
        ),
      );
    }
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      result = result.filter((row) => String(row[key] ?? "") === value);
    }
    return result;
  }, [schema.mode, schema.columns, allRows, search, filters]);

  const rows = schema.mode === "server" ? allRows : clientFiltered;
  const total = schema.mode === "server" ? serverTotal : clientFiltered.length;

  return {
    rows,
    total,
    loading,
    error,
    pageIndex,
    limit,
    setPageIndex: (index) => setPageIndex(Math.max(0, index)),
    sorting,
    setSorting: (next) => {
      setSorting(next);
      setPageIndex(0);
    },
    search,
    setSearch: (value) => {
      setSearch(value);
      setPageIndex(0);
    },
    filters,
    setFilter: (accessorKey, value) => {
      setFilters((current) => {
        if (!value) {
          const rest = { ...current };
          delete rest[accessorKey];
          return rest;
        }
        return { ...current, [accessorKey]: value };
      });
      setPageIndex(0);
    },
    refetch: () => setRefetchToken((t) => t + 1),
  };
}
