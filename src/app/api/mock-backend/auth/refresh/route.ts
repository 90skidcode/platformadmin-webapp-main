import { rotateTokens } from "@/mocks/db";
import { failure, success } from "@/mocks/http";

/** Stands in for `${AUTH_API_URL}/auth/refresh` (plan §4.3). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const refreshToken =
    typeof body?.refreshToken === "string" ? body.refreshToken : "";

  const rotated = rotateTokens(refreshToken);
  if (!rotated) {
    return failure(401, "AUTH_INVALID_REFRESH_TOKEN");
  }

  return success(200, "AUTH_REFRESH_OK", rotated);
}
