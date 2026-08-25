/**
 * The real backend's list responses don't match this app's internal
 * `ApiListData<T>` contract (`{ items, pagination: { page, limit,
 * totalItems, totalPages } }`, camelCase) -- confirmed against `GET
 * /users`, which returns `{ data: { data: [...], pagination: { page,
 * limit, total_items, total_pages } } }` instead, and takes `limit` (not
 * `pageSize`) as its page-size query param. This is the one place that gap
 * gets closed, at the BFF boundary (§6.2), so `useTableData` and every
 * table schema keep assuming the original contract unchanged.
 */

interface BackendPagination {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

interface BackendListEnvelope {
  data?: { data?: unknown[]; pagination?: BackendPagination };
}

/** `request.nextUrl.search`-shaped in, same shape out: either `""` or a
 * string starting with `?`. */
export function translateListSearchParams(search: string): string {
  if (!search) return search;
  const params = new URLSearchParams(search);
  const pageSize = params.get("pageSize");
  if (pageSize !== null) {
    params.delete("pageSize");
    params.set("limit", pageSize);
  }
  return params.size ? `?${params}` : "";
}

/** No-op (returns `raw` unchanged) for anything that isn't the backend's
 * nested-list shape -- single-record responses, mutation responses, and
 * non-JSON/error bodies all pass through untouched. */
export function normalizeListBody(raw: string): string {
  let parsed: BackendListEnvelope;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return raw;
  }

  const list = parsed.data;
  if (!list || !Array.isArray(list.data) || !list.pagination) return raw;

  const { page, limit, total_items, total_pages } = list.pagination;
  return JSON.stringify({
    ...parsed,
    data: {
      items: list.data,
      pagination: {
        page,
        limit,
        totalItems: total_items,
        totalPages: total_pages,
      },
    },
  });
}
