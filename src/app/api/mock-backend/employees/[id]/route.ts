import { NextResponse } from "next/server";

import { employees } from "@/mocks/db";
import { isAuthError, requireAuth } from "@/mocks/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const employee = employees.find((e) => e.id === id);
  if (!employee)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(employee);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const index = employees.findIndex((e) => e.id === id);
  if (index === -1)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const patch = await request.json().catch(() => ({}));
  employees[index] = { ...employees[index], ...patch, id };
  return NextResponse.json(employees[index]);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const index = employees.findIndex((e) => e.id === id);
  if (index === -1)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  employees.splice(index, 1);
  return NextResponse.json({ ok: true });
}
