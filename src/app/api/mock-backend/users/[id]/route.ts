import { NextResponse } from "next/server";

import { users } from "@/mocks/db";
import { isAuthError, omitPassword, requireAuth } from "@/mocks/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const index = users.findIndex((u) => u.id === id);
  if (index === -1)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const patch = await request.json().catch(() => ({}));
  users[index] = { ...users[index], ...patch, id };
  return NextResponse.json(omitPassword(users[index]));
}
