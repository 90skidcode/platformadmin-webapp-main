/**
 * Shared shape for the org-wide API response envelope (API-Standards-Guide.md
 * §1-3): every endpoint -- this repo's mock backend included -- returns
 * `{ code, message, data }`, where `code` is `{S|W|E}_{httpStatus}_{BUSINESS_CODE}`.
 *
 * Pure types + tiny pure helpers only, no `server-only` import, so both the
 * mock-backend routes (server) and the components/hooks that parse their
 * responses (client) share one definition of the contract.
 */

export type StatusPrefix = "S" | "W" | "E";

export interface ApiEnvelope<T> {
  code: string;
  message: string;
  data: T;
}

/** §3: field-level validation errors, carried in `data.errors` on an
 * `E_422_VALIDATION_FAILED` response. */
export interface ApiFieldError {
  field: string;
  issue: string;
}

/** §6: the `data` shape of every paginated list endpoint. */
export interface ApiPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiListData<T> {
  items: T[];
  pagination: ApiPagination;
}

export function buildCode(
  prefix: StatusPrefix,
  httpStatus: number,
  businessCode: string,
): string {
  return `${prefix}_${httpStatus}_${businessCode}`;
}

/** `code`'s first segment -- `null` for a malformed/missing code rather than
 * throwing, since this only ever inspects a response the app doesn't control. */
export function statusPrefixOf(code: string | undefined): StatusPrefix | null {
  const prefix = code?.slice(0, 1);
  return prefix === "S" || prefix === "W" || prefix === "E" ? prefix : null;
}

export function isErrorEnvelope(code: string | undefined): boolean {
  return statusPrefixOf(code) === "E";
}

export function parseApiErrorMessage(
  body: unknown,
  fallbackStatus: number,
): string {
  const b = body as {
    message?: string;
    detail?: string | { msg?: string }[];
    data?: { errors?: { issue?: string }[] };
  } | null;

  const dataErrors = b?.data?.errors
    ?.map((e) => e.issue)
    .filter(Boolean)
    .join(", ");
  if (dataErrors) return dataErrors;

  if (typeof b?.detail === "string") return b.detail;
  if (Array.isArray(b?.detail)) {
    const detailErrors = b.detail
      .map((d) => d.msg)
      .filter(Boolean)
      .join(", ");
    if (detailErrors) return detailErrors;
  }

  if (b?.message) return b.message;

  return `Request failed with ${fallbackStatus}`;
}
