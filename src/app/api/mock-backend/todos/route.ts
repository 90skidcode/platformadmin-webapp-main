import { failure, isAuthError, requireAuth, success } from "@/mocks/http";
import todosTableSchema from "@/schemas/tables/todos-table.json";

interface Todo {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  let rawBase = (
    process.env.JSONPLACEHOLDER_BASE_URL ||
    "https://jsonplaceholder.typicode.com"
  ).trim();
  while (rawBase.endsWith("/") || rawBase.endsWith("~")) {
    rawBase = rawBase.slice(0, -1);
  }

  const endpointPath = todosTableSchema.endpoint?.url ?? "/todos";
  const path = endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`;
  const url = `${rawBase}${path}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = (await res.json()) as Todo[];
      return success(200, "TODOS_LIST_OK", data);
    }
    return failure(res.status, "TODOS_FETCH_FAILED");
  } catch (err) {
    console.error("Failed to fetch todos from endpoint:", err);
    return failure(500, "TODOS_FETCH_FAILED");
  }
}
