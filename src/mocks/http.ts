import "server-only";
import { NextResponse } from "next/server";

import { type MockUser, verifyAccessToken } from "./db";

/** Every mock-backend route requires a bearer token, same as the real backend would. */
export function requireAuth(request: Request): MockUser | NextResponse {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : null;
  const user = verifyAccessToken(token);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return user;
}

export function isAuthError(result: unknown): result is NextResponse {
  return result instanceof NextResponse;
}

/** Never relay password hashes/plaintext to the browser, mock or not. */
export function omitPassword(user: MockUser): Omit<MockUser, "password"> {
  const safe: Partial<MockUser> = { ...user };
  delete safe.password;
  return safe as Omit<MockUser, "password">;
}

const RESERVED_PAGE_PARAMS = new Set([
  "page",
  "pageSize",
  "search",
  "sortBy",
  "sortDir",
]);

export interface PageParams {
  page: number;
  pageSize: number;
  search: string;
  sortBy: string | null;
  sortDir: "asc" | "desc";
  /** Every non-reserved query param, verbatim -- the table engine's
   * `TableFilter.accessorKey` doubles as the param name, so a new filter
   * needs no new backend code (see `paginate()` below). */
  filters: Record<string, string>;
}

export function parsePageParams(
  url: URL,
  defaultSortBy: string | null = null,
): PageParams {
  const filters: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    if (!RESERVED_PAGE_PARAMS.has(key) && value) filters[key] = value;
  }

  return {
    page: Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1),
    pageSize: Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("pageSize") ?? "10") || 10),
    ),
    search: (url.searchParams.get("search") ?? "").trim().toLowerCase(),
    sortBy: url.searchParams.get("sortBy") ?? defaultSortBy,
    sortDir: url.searchParams.get("sortDir") === "desc" ? "desc" : "asc",
    filters,
  };
}

/** Filters (both the free-text `search` and any exact-match `filters`), sorts, and paginates.
 * Mirrors the shape a real server-mode table data source would return:
 * { data, page, pageSize, total }. */
export function paginate<T extends object>(
  items: T[],
  params: PageParams,
  searchFields: (keyof T)[],
) {
  let result = items;

  for (const [key, value] of Object.entries(params.filters)) {
    result = result.filter(
      (item) => String(item[key as keyof T] ?? "") === value,
    );
  }

  if (params.search) {
    result = result.filter((item) =>
      searchFields.some((field) =>
        String(item[field] ?? "")
          .toLowerCase()
          .includes(params.search),
      ),
    );
  }

  if (params.sortBy) {
    const key = params.sortBy as keyof T;
    result = [...result].sort((a, b) => {
      const av = String(a[key] ?? "");
      const bv = String(b[key] ?? "");
      return params.sortDir === "asc"
        ? av.localeCompare(bv)
        : bv.localeCompare(av);
    });
  }

  const total = result.length;
  const start = (params.page - 1) * params.pageSize;
  const data = result.slice(start, start + params.pageSize);

  return { data, page: params.page, pageSize: params.pageSize, total };
}
