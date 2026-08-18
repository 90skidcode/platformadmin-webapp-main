import { findUserByEmail, issueTokenPair, touchLastLogin } from "@/mocks/db";
import { failure, success } from "@/mocks/http";

/**
 * Stands in for `${API_URL}/auth/login` (plan §4.1). Real shape:
 * { user, accessToken, refreshToken, accessTokenExpires, roles, permissions, tenants }.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const user = findUserByEmail(email);
  if (!user || user.password !== password || user.status === "deactivated") {
    return failure(401, "AUTH_INVALID_CREDENTIALS");
  }

  const { accessToken, refreshToken, accessTokenExpires } = issueTokenPair(
    user.id,
  );
  touchLastLogin(user.id);

  return success(200, "AUTH_LOGIN_OK", {
    user: { id: user.id, name: user.name, email: user.email },
    accessToken,
    refreshToken,
    accessTokenExpires,
    roles: user.roles,
    permissions: user.permissions,
    tenants: user.tenants,
  });
}
