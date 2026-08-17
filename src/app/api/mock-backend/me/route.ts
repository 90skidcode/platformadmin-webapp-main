import { isAuthError, requireAuth, success } from "@/mocks/http";

/** Branch 2 of `resolve-roles.ts` (plan §4.2): a separate `/me` call, exercised by that test suite. */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  return success(200, "ME_FETCH_OK", {
    roles: auth.roles,
    permissions: auth.permissions,
    tenants: auth.tenants,
  });
}
