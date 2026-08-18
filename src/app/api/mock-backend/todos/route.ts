import { type MockTask, todos } from "@/mocks/db";
import {
  failure,
  fieldErrorMessage,
  isAuthError,
  paginate,
  parsePageParams,
  requireAuth,
  success,
  toListData,
} from "@/mocks/http";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const params = parsePageParams(url, "id");
  const page = paginate(todos, params, ["title"]);
  return success(200, "TODO_LIST_OK", toListData(page));
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const body = (await request.json().catch(() => ({}))) as Partial<MockTask>;
  const errors = [
    ...(body.title
      ? []
      : [{ field: "title", issue: await fieldErrorMessage("titleRequired") }]),
  ];
  if (errors.length > 0) {
    return failure(422, "VALIDATION_FAILED", errors);
  }

  const nextId =
    todos.length > 0 ? Math.max(...todos.map((t) => Number(t.id))) + 1 : 1;
  const task: MockTask = {
    id: nextId,
    userId: Number(body.userId) || 1,
    title: String(body.title),
    completed: Boolean(body.completed),
  };
  todos.unshift(task);
  return success(201, "TODO_CREATED", task);
}
