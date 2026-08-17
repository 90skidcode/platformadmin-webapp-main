import { NextResponse } from "next/server";

import { auditLog } from "@/mocks/db";
import {
  isAuthError,
  paginate,
  parsePageParams,
  requireAuth,
} from "@/mocks/http";

/** Read-only, server-mode table (plan §12) -- no write endpoints exist for this entity at all. */
export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const params = parsePageParams(url, "timestamp");
  if (params.sortBy === "timestamp" && !url.searchParams.get("sortDir")) {
    params.sortDir = "desc"; // most recent first by default
  }
  return NextResponse.json(
    paginate(auditLog, params, ["actor", "action", "entity"]),
  );
}
