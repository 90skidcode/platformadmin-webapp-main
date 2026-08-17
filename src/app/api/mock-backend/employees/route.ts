import { NextResponse } from "next/server";

import { type MockEmployee, employees } from "@/mocks/db";
import {
  isAuthError,
  paginate,
  parsePageParams,
  requireAuth,
} from "@/mocks/http";

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const params = parsePageParams(url, "name");
  return NextResponse.json(
    paginate(employees, params, ["name", "email", "department", "title"]),
  );
}

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  const body = (await request
    .json()
    .catch(() => ({}))) as Partial<MockEmployee>;
  if (!body.name || !body.email) {
    return NextResponse.json(
      { error: "name and email are required" },
      { status: 400 },
    );
  }

  const employee: MockEmployee = {
    id: `emp-${crypto.randomUUID().slice(0, 8)}`,
    name: body.name,
    email: body.email,
    department: body.department ?? "Unassigned",
    title: body.title ?? "",
    startDate: body.startDate ?? new Date().toISOString().slice(0, 10),
    notes: body.notes,
    status: "onboarding",
  };
  employees.unshift(employee);
  return NextResponse.json(employee, { status: 201 });
}
