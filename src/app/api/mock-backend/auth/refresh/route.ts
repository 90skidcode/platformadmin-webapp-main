import { NextResponse } from "next/server";

import { rotateTokens } from "@/mocks/db";

/** Stands in for `${AUTH_API_URL}/auth/refresh` (plan §4.3). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const refreshToken =
    typeof body?.refreshToken === "string" ? body.refreshToken : "";

  const rotated = rotateTokens(refreshToken);
  if (!rotated) {
    return NextResponse.json(
      { error: "invalid_refresh_token" },
      { status: 401 },
    );
  }

  return NextResponse.json(rotated);
}
