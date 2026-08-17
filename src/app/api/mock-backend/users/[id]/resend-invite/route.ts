import { NextResponse } from "next/server";

import { users } from "@/mocks/db";
import { isAuthError, requireAuth } from "@/mocks/http";

type RouteContext = { params: Promise<{ id: string }> };

/** Backs the table's `type: "custom"` row action (plan §7.2's `resendInvite` example). */
export async function POST(request: Request, { params }: RouteContext) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const user = users.find((u) => u.id === id);
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (user.status !== "invited") {
    return NextResponse.json({ error: "user_already_active" }, { status: 409 });
  }

  return NextResponse.json({ ok: true, resentTo: user.email });
}
