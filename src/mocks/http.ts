import "server-only";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import {
  type ApiFieldError,
  type ApiListData,
  type StatusPrefix,
  buildCode,
} from "@/lib/api-envelope";
import { type MockUser, verifyAccessToken } from "./db";

/** `message` is never a hardcoded literal in a route -- it's always resolved
 * from the request's locale (the same `NEXT_LOCALE` cookie the rest of the
 * app reads, via `src/i18n/request.ts`), keyed by the business code itself
 * so `code` and `message` can't drift out of sync with each other.
 * `messages/{locale}/common.json`'s `apiMessages` is the registry. */
async function messageFor(businessCode: string): Promise<string> {
  const t = await getTranslations("common.apiMessages");
  return t(businessCode);
}

/** Same idea as `messageFor`, for the per-field validation issue text a
 * route builds into `data.errors` (see `common.json`'s `apiFieldErrors`). */
export async function fieldErrorMessage(key: string): Promise<string> {
  const t = await getTranslations("common.apiFieldErrors");
  return t(key);
}

/** API-Standards-Guide.md §1: every mock-backend response uses this
 * envelope -- `{ code, message, data }`, `code` = `{S|W|E}_{httpStatus}_{BUSINESS_CODE}`. */
async function envelope<T>(
  prefix: StatusPrefix,
  httpStatus: number,
  businessCode: string,
  data: T,
) {
  return NextResponse.json(
    {
      code: buildCode(prefix, httpStatus, businessCode),
      message: await messageFor(businessCode),
      data,
    },
    { status: httpStatus },
  );
}

export function success<T>(httpStatus: number, businessCode: string, data: T) {
  return envelope("S", httpStatus, businessCode, data);
}

/** §1: succeeded, but something needs the client's attention (e.g. a
 * side-effect failed) -- still a 2xx, still carries `data`. */
export function warning<T>(httpStatus: number, businessCode: string, data: T) {
  return envelope("W", httpStatus, businessCode, data);
}

/** §3: `data` is `{ errors }` when field-level validation errors are given,
 * `null` otherwise (e.g. 404/401/409). */
export function failure(
  httpStatus: number,
  businessCode: string,
  errors?: ApiFieldError[],
) {
  return envelope("E", httpStatus, businessCode, errors ? { errors } : null);
}

/** Every mock-backend route requires a bearer token, same as the real backend would. */
export async function requireAuth(
  request: Request,
): Promise<MockUser | NextResponse> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : null;
  const user = verifyAccessToken(token);
  if (!user) {
    return failure(401, "AUTH_REQUIRED");
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
    if (key === "from_date") {
      result = result.filter((item) => {
        const itemRecord = item as Record<string, unknown>;
        const rowDate = String(
          itemRecord.created_at ?? itemRecord.createdAt ?? "",
        ).slice(0, 10);
        return rowDate ? rowDate >= value : true;
      });
    } else if (key === "to_date") {
      result = result.filter((item) => {
        const itemRecord = item as Record<string, unknown>;
        const rowDate = String(
          itemRecord.created_at ?? itemRecord.createdAt ?? "",
        ).slice(0, 10);
        return rowDate ? rowDate <= value : true;
      });
    } else {
      result = result.filter(
        (item) =>
          String(item[key as keyof T] ?? "").toLowerCase() ===
            value.toLowerCase() ||
          String(item[key as keyof T] ?? "")
            .toLowerCase()
            .includes(value.toLowerCase()),
      );
    }
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

/** §6: reshapes a `paginate()` result into the guide's list-endpoint `data`
 * shape -- `{ items, pagination: { page, limit, totalItems, totalPages } }`. */
export function toListData<T>(page: {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}): ApiListData<T> {
  return {
    items: page.data,
    pagination: {
      page: page.page,
      limit: page.pageSize,
      totalItems: page.total,
      totalPages: Math.max(1, Math.ceil(page.total / page.pageSize)),
    },
  };
}
