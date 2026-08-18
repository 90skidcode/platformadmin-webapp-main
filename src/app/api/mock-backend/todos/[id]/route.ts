import { todos } from "@/mocks/db";
import { failure, isAuthError, requireAuth, success } from "@/mocks/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const numId = Number(id);
  const todo = todos.find((t) => t.id === numId);
  if (!todo) return failure(404, "TODO_NOT_FOUND");
  return success(200, "TODO_FETCH_OK", todo);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const numId = Number(id);
  const index = todos.findIndex((t) => t.id === numId);
  if (index === -1) return failure(404, "TODO_NOT_FOUND");

  const patch = await request.json().catch(() => ({}));
  todos[index] = { ...todos[index], ...patch, id: numId };
  return success(200, "TODO_UPDATED", todos[index]);
}

export async function PUT(request: Request, { params }: RouteContext) {
  return PATCH(request, { params });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const numId = Number(id);
  const index = todos.findIndex((t) => t.id === numId);
  if (index === -1) return failure(404, "TODO_NOT_FOUND");

  todos.splice(index, 1);
  return success(200, "TODO_DELETED", null);
}
