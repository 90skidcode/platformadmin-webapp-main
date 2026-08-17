import { NextResponse } from "next/server";

import { type MockUser, users } from "@/mocks/db";
import {
  isAuthError,
  omitPassword,
  paginate,
  parsePageParams,
  requireAuth,
} from "@/mocks/http";

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const params = parsePageParams(url, "name");
  const page = paginate(users, params, ["name", "email"]);
  // Never relay password hashes/plaintext to the browser, mock or not.
  return NextResponse.json({
    ...page,
    data: page.data.map(omitPassword),
  });
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  const body = (await request.json().catch(() => ({}))) as Partial<MockUser>;
  if (!body.email || !body.name) {
    return NextResponse.json(
      { error: "name and email are required" },
      { status: 400 },
    );
  }

  const user: MockUser = {
    id: `user-${crypto.randomUUID().slice(0, 8)}`,
    email: body.email,
    name: body.name,
    password: crypto.randomUUID(), // invited user sets their own password later, in a real backend
    roles: body.roles?.length ? body.roles : ["viewer"],
    permissions: ["users.read", "employees.read"],
    tenants: auth.tenants,
    status: "invited",
    lastLoginAt: null,
  };
  users.unshift(user);
  return NextResponse.json(omitPassword(user), { status: 201 });
}
