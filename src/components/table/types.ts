export type { ActionHandlers } from "@/lib/action-handlers/action-handlers";
import type { ActionResultConfig } from "@/lib/action-handlers/action-result";

export type {
  ActionResultConfig,
  ToastActionConfig,
} from "@/lib/action-handlers/action-result";

export type CellType = "text" | "badge" | "date" | "email";

export interface TableColumn {
  accessorKey: string;
  header?: string;
  headerKey?: string;
  cell?: CellType;
  /** Maps a raw cell value to a Badge variant, `cell: "badge"` only -- e.g. `{ active: "success", offboarded: "destructive" }`. */
  badgeVariants?: Record<
    string,
    "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
  >;
  sortable?: boolean;
  width?: string;
  badgeLabel?: Record<string, string>;
}

export interface TableFilterOption {
  value: string;
  label?: string;
  labelKey?: string;
}

/** An exact-match dropdown filter over one column. `accessorKey` doubles as
 * the query-param name in `server` mode -- the mock backend (and any real
 * backend following the same convention) treats every non-reserved query
 * param on a paginated list endpoint as an exact-match filter, so adding a
 * filter here needs no backend code change, same spirit as `search`/`sort`. */
export interface TableFilter {
  accessorKey: string;
  label?: string;
  labelKey?: string;
  options: TableFilterOption[];
}

interface ConfirmConfig {
  title?: string;
  titleKey?: string;
  message?: string;
  messageKey?: string;
}

export type RowActionHandlerType = "navigate" | "api" | "custom";

/** `url` supports `{id}`-style substitution from the row (see `interpolateRow`).
 * `body` is a static JSON payload (e.g. `{ "status": "deactivated" }`) for
 * actions that aren't a bare DELETE. */
export interface ActionEndpoint {
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  body?: Record<string, unknown>;
}

/** Fields shared by both RowAction and BulkAction -- everything except how
 * the action is triggered (`handler`) and what it operates on. */
interface BaseAction {
  id: string;
  label?: string;
  labelKey?: string;
  icon?: string;
  /** `custom` only -- key into the consumer-supplied `actionHandlers` registry (plan §9). */
  onClick?: string;
  confirm?: ConfirmConfig;
  /** Gates visibility via `can()` (plan §5) -- same concept as form action `permission`. */
  permission?: string;
  onSuccess?: ActionResultConfig;
  onError?: ActionResultConfig;
}

export interface RowAction extends BaseAction {
  handler: RowActionHandlerType;
  /** `navigate` only -- `{id}` (or any column key in `{braces}`) is substituted from the row. */
  target?: string;
  /** `api` only. */
  endpoint?: ActionEndpoint;
}

export interface BulkAction extends BaseAction {
  handler: "api" | "custom";
  endpoint?: ActionEndpoint;
}

export interface TableSchema {
  id: string;
  i18nNamespace?: string;
  /** `client`: fetched (or given) once, sort/search/paginate happen in the
   * browser. `server`: every sort/search/page change re-fetches (plan §4/§12). */
  mode: "client" | "server";
  /** GET list endpoint, resolved through the BFF proxy like any other `endpoint.url` (plan §6). */
  endpoint?: { url: string };
  columns: TableColumn[];
  rowActions?: RowAction[];
  bulkActions?: BulkAction[];
  selectable?: boolean;
  search?: { enabled?: boolean; placeholderKey?: string };
  /** One dropdown per entry, rendered beside the search box. */
  filters?: TableFilter[];
  pageSize?: number;
  /** Row-virtualizes the desktop table body (plan §10's perf pass), worth
   * it once a dataset is large enough that rendering every row's DOM node
   * becomes the bottleneck. `mode: "client"` only: replaces pagination
   * entirely (scroll through everything instead of paging -- `pageSize`
   * and the pagination controls are ignored when this is on), since
   * virtualizing a single already-small page defeats the point. */
  virtualize?: boolean;
  /** Small-viewport rendering: `scroll` (default, horizontally-scrollable
   * table) or `cards` (stacked card list, no horizontal scroll at all). */
  display?: { mobile?: "scroll" | "cards" };
}

export type { ApiEnvelope, ApiListData } from "@/lib/api-envelope";
