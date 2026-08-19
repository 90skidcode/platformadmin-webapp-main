import { isAuthError, requireAuth, success } from "@/mocks/http";

interface Todo {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
}

const fallbackTodos: Todo[] = [
  { id: 1, userId: 1, title: "delectus aut autem", completed: false },
  {
    id: 2,
    userId: 1,
    title: "quis ut nam facilis et officia qui",
    completed: false,
  },
  { id: 3, userId: 1, title: "fugiat veniam minus", completed: false },
  { id: 4, userId: 1, title: "et porro tempora", completed: true },
  {
    id: 5,
    userId: 1,
    title: "laboriosam mollitia et enim quasi adipisci quia provident illum",
    completed: false,
  },
  {
    id: 6,
    userId: 1,
    title: "qui ullam ratione quibusdam voluptatem quia omnis",
    completed: false,
  },
  {
    id: 7,
    userId: 1,
    title: "illo expedita consequatur quia in",
    completed: false,
  },
  { id: 8, userId: 1, title: "quo adipisci enim quam ut ab", completed: true },
  { id: 9, userId: 1, title: "molestiae perspiciatis ipsa", completed: false },
  {
    id: 10,
    userId: 1,
    title: "illo est ratione doloremque quia maiores aut",
    completed: true,
  },
];

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const baseUrl = process.env.JSONPLACEHOLDER_BASE_URL;

  if (baseUrl) {
    const trimmed = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const url = trimmed.endsWith("/todos") ? trimmed : `${trimmed}/todos`;

    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = (await res.json()) as Todo[];
        return success(200, "TODOS_LIST_OK", data);
      }
    } catch {
      // Fallback if external service is unreachable
    }
  }

  return success(200, "TODOS_LIST_OK", fallbackTodos);
}
