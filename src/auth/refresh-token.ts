/** Rotates the backend access token before it expires (plan §4.3). The real
 * `/auth/login` response turned out to be `{ access_token, refresh_token,
 * token_type }` (snake_case, no `accessTokenExpires` field -- see
 * auth.config.ts), not the plan's assumed shape -- `/auth/refresh` is
 * assumed to mirror that same login contract until confirmed otherwise. */
import "server-only";
import type { JWT } from "next-auth/jwt";

import type { ApiEnvelope } from "@/lib/api-envelope";
import { apiEndpoints } from "@/lib/api-endpoints";
import { decodeJwtPayload } from "./decode-jwt";

interface RefreshData {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(
      `${process.env.API_URL}${apiEndpoints.auth.refresh}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: token.refreshToken }),
      },
    );
    if (!res.ok) throw new Error(`refresh failed with ${res.status}`);
    const body = (await res.json()) as ApiEnvelope<RefreshData>;
    const accessToken = body.data.access_token;
    const payload = decodeJwtPayload(accessToken);
    const accessTokenExpires =
      typeof payload?.exp === "number"
        ? payload.exp * 1000
        : Date.now() + 15 * 60_000;

    return {
      ...token,
      accessToken,
      accessTokenExpires,
      refreshToken: body.data.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch {
    // session.error surfaces this; the client forces sign-out on it (§4.1's session callback).
    return { ...token, error: "RefreshAccessTokenError" };
  }
}
