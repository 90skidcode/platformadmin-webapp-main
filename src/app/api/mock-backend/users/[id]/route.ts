import { users } from "@/mocks/db";
import {
  failure,
  isAuthError,
  omitPassword,
  requireAuth,
  success,
} from "@/mocks/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return failure(404, "USR_NOT_FOUND");

  const patch = await request.json().catch(() => ({}));
  users[index] = { ...users[index], ...patch, id };
  return success(200, "USR_UPDATED", omitPassword(users[index]));
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return failure(404, "USR_NOT_FOUND");

  users.splice(index, 1);
  return success(200, "USR_DELETED", null);
}
