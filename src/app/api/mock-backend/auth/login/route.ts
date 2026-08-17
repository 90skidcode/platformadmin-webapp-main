import { NextResponse } from "next/server";

import { findUserByEmail, issueTokenPair, touchLastLogin } from "@/mocks/db";

/**
 * Stands in for `${AUTH_API_URL}/auth/login` (plan §4.1). Real shape:
 * { user, accessToken, refreshToken, accessTokenExpires, roles, permissions, tenants }.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const user = findUserByEmail(email);
  if (!user || user.password !== password || user.status === "deactivated") {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const { accessToken, refreshToken, accessTokenExpires } = issueTokenPair(
    user.id,
  );
  touchLastLogin(user.id);

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
    accessToken,
    refreshToken,
    accessTokenExpires,
    roles: user.roles,
    permissions: user.permissions,
    tenants: user.tenants,
  });
}
