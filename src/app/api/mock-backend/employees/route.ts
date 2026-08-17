import { type MockEmployee, employees } from "@/mocks/db";
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
  const params = parsePageParams(url, "name");
  const page = paginate(employees, params, [
    "name",
    "email",
    "department",
    "title",
  ]);
  return success(200, "EMP_LIST_OK", toListData(page));
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const body = (await request
    .json()
    .catch(() => ({}))) as Partial<MockEmployee>;
  const errors = [
    ...(body.name
      ? []
      : [{ field: "name", issue: await fieldErrorMessage("nameRequired") }]),
    ...(body.email
      ? []
      : [{ field: "email", issue: await fieldErrorMessage("emailRequired") }]),
  ];
  if (errors.length > 0) {
    return failure(422, "VALIDATION_FAILED", errors);
  }

  const employee: MockEmployee = {
    id: `emp-${crypto.randomUUID().slice(0, 8)}`,
    name: body.name!,
    email: body.email!,
    department: body.department ?? "Unassigned",
    title: body.title ?? "",
    startDate: body.startDate ?? new Date().toISOString().slice(0, 10),
    notes: body.notes,
    status: "onboarding",
  };
  employees.unshift(employee);
  return success(201, "EMP_CREATED", employee);
}
