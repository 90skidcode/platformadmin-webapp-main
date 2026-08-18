import { todos } from "@/mocks/db";
import { failure, isAuthError, requireAuth, success } from "@/mocks/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const task = todos.find((t) => String(t.id) === String(id));
  if (!task) return failure(404, "TODO_NOT_FOUND");
  return success(200, "TODO_FETCH_OK", task);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const index = todos.findIndex((t) => String(t.id) === String(id));
  if (index === -1) return failure(404, "TODO_NOT_FOUND");

  const patch = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  todos[index] = { ...todos[index], ...patch, id: todos[index].id };
  return success(200, "TODO_UPDATED", todos[index]);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const index = todos.findIndex((t) => String(t.id) === String(id));
  if (index === -1) return failure(404, "TODO_NOT_FOUND");

  todos.splice(index, 1);
  return success(200, "TODO_DELETED", null);
}
