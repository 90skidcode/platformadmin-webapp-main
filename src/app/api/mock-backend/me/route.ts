import { NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/mocks/http";

/** Branch 2 of `resolve-roles.ts` (plan §4.2): a separate `/me` call, exercised by that test suite. */
export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  return NextResponse.json({
    roles: auth.roles,
    permissions: auth.permissions,
    tenants: auth.tenants,
  });
}
