"use client";

import { useEffect, useMemo, useState } from "react";
import type { SortingState } from "@tanstack/react-table";

import type { ApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import type { TablePage, TableSchema } from "./types";

const EMPTY_ROWS: Record<string, unknown>[] = [];

export interface UseTableDataResult<T> {
  rows: T[];
  total: number;
  loading: boolean;
  error: boolean;
  pageIndex: number;
  pageSize: number;
  setPageIndex: (index: number) => void;
  sorting: SortingState;
  setSorting: (sorting: SortingState) => void;
  search: string;
  setSearch: (value: string) => void;
  refetch: () => void;
}

/**
 * `client` mode (plan §3): fetched once (or given via `data`), then every
 * sort/search/page change is handled in the browser by @tanstack/react-table.
 * `server` mode (plan §4): every sort/search/page change re-fetches through
 * the BFF proxy, expecting the `{ data, page, pageSize, total }` shape the
 * mock backend's `paginate()` returns.
 */
export function useTableData<T extends Record<string, unknown>>(
  schema: TableSchema,
  staticData: T[] | undefined,
  apiFetcher: ApiFetcher,
): UseTableDataResult<T> {
  const pageSize = schema.pageSize ?? 10;

  const [allRows, setAllRows] = useState<T[]>(
    staticData ?? (EMPTY_ROWS as T[]),
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(
    schema.mode === "server" || (!staticData && !!schema.endpoint),
  );
  const [error, setError] = useState(false);
  const [refetchToken, setRefetchToken] = useState(0);
  const [serverTotal, setServerTotal] = useState(0);

  const sortBy = sorting[0]?.id;
  const sortDir = sorting[0]?.desc ? "desc" : "asc";
  // Only server mode's page/search should trigger a refetch -- client mode
  // handles both in the browser (see `clientFiltered` below). Named here,
  // not inlined in the deps array, so the dependency list stays staticly
  // checkable.
  const serverPageIndex = schema.mode === "server" ? pageIndex : 0;
  const serverSearch = schema.mode === "server" ? search : "";

  useEffect(() => {
    if (schema.mode === "client" && staticData) return; // static data, nothing to fetch
    if (!schema.endpoint) return;

    let cancelled = false;
    setLoading(true);
    setError(false);

    const params = new URLSearchParams();
    if (schema.mode === "server") {
      params.set("page", String(pageIndex + 1));
      params.set("pageSize", String(pageSize));
      if (search) params.set("search", search);
      if (sortBy) {
        params.set("sortBy", sortBy);
        params.set("sortDir", sortDir);
      }
    }
    const url = params.size
      ? `${schema.endpoint.url}?${params}`
      : schema.endpoint.url;

    apiFetcher(url)
      .then((res) => res.json())
      .then((body: TablePage<T> | T[]) => {
        if (cancelled) return;
        if (Array.isArray(body)) {
          setAllRows(body);
          setServerTotal(body.length);
        } else {
          setAllRows(body.data);
          setServerTotal(body.total);
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
    sortBy,
    sortDir,
    refetchToken,
  ]);

  const clientFiltered = useMemo(() => {
    if (schema.mode !== "client" || !search) return allRows;
    const needle = search.toLowerCase();
    return allRows.filter((row) =>
      schema.columns.some((col) =>
        String(row[col.accessorKey] ?? "")
          .toLowerCase()
          .includes(needle),
      ),
    );
  }, [schema.mode, schema.columns, allRows, search]);

  const rows = schema.mode === "server" ? allRows : clientFiltered;
  const total = schema.mode === "server" ? serverTotal : clientFiltered.length;

  return {
    rows,
    total,
    loading,
    error,
    pageIndex,
    pageSize,
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
    refetch: () => setRefetchToken((t) => t + 1),
  };
}
