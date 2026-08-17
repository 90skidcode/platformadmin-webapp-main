import { auditLog } from "@/mocks/db";
import {
  isAuthError,
  paginate,
  parsePageParams,
  requireAuth,
  success,
  toListData,
} from "@/mocks/http";

/** Read-only, server-mode table (plan §12) -- no write endpoints exist for this entity at all. */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const params = parsePageParams(url, "timestamp");
  if (params.sortBy === "timestamp" && !url.searchParams.get("sortDir")) {
    params.sortDir = "desc"; // most recent first by default
  }
  const page = paginate(auditLog, params, ["actor", "action", "entity"]);
  return success(200, "AUDIT_LIST_OK", toListData(page));
}
