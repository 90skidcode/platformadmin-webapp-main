import { employees } from "@/mocks/db";
import { failure, isAuthError, requireAuth, success } from "@/mocks/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const employee = employees.find((e) => e.id === id);
  if (!employee) return failure(404, "EMP_NOT_FOUND");
  return success(200, "EMP_FETCH_OK", employee);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const index = employees.findIndex((e) => e.id === id);
  if (index === -1) return failure(404, "EMP_NOT_FOUND");

  const patch = await request.json().catch(() => ({}));
  employees[index] = { ...employees[index], ...patch, id };
  return success(200, "EMP_UPDATED", employees[index]);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const index = employees.findIndex((e) => e.id === id);
  if (index === -1) return failure(404, "EMP_NOT_FOUND");

  employees.splice(index, 1);
  return success(200, "EMP_DELETED", null);
}
