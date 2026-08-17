import { type MockUser, users } from "@/mocks/db";
import {
  failure,
  fieldErrorMessage,
  isAuthError,
  omitPassword,
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
  const page = paginate(users, params, ["name", "email"]);
  // Never relay password hashes/plaintext to the browser, mock or not.
  return success(
    200,
    "USR_LIST_OK",
    toListData({ ...page, data: page.data.map(omitPassword) }),
  );
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const body = (await request.json().catch(() => ({}))) as Partial<MockUser>;
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

  const user: MockUser = {
    id: `user-${crypto.randomUUID().slice(0, 8)}`,
    email: body.email!,
    name: body.name!,
    password: crypto.randomUUID(), // invited user sets their own password later, in a real backend
    roles: body.roles?.length ? body.roles : ["viewer"],
    permissions: ["users.read", "employees.read"],
    tenants: auth.tenants,
    status: "invited",
    lastLoginAt: null,
  };
  users.unshift(user);
  return success(201, "USR_CREATED", omitPassword(user));
}
