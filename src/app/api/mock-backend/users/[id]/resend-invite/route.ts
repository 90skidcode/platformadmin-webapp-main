import { users } from "@/mocks/db";
import { failure, isAuthError, requireAuth, success } from "@/mocks/http";

type RouteContext = { params: Promise<{ id: string }> };

/** Backs the table's `type: "custom"` row action (plan §7.2's `resendInvite` example). */
export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const user = users.find((u) => u.id === id);
  if (!user) return failure(404, "USR_NOT_FOUND");
  if (user.status !== "invited") {
    return failure(409, "USR_ALREADY_ACTIVE");
  }

  return success(200, "USR_INVITE_RESENT", { resentTo: user.email });
}
