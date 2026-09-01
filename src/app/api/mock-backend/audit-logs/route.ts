import { auditLogs } from "@/mocks/db";
import {
  isAuthError,
  paginate,
  parsePageParams,
  requireAuth,
  success,
  toListData,
} from "@/mocks/http";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const params = parsePageParams(url, "created_at");
  const page = paginate(auditLogs, params, [
    "actor",
    "action",
    "resource_type",
    "actor_type",
    "ip_address",
  ]);

  return success(200, "AUDIT_LIST_OK", toListData(page));
}
