/** Rotates the backend access token before it expires (plan §4.3). Assumes
 * the backend exposes `POST /auth/refresh` accepting `{ refreshToken }` --
 * flagged as an open assumption in plan §19 until confirmed. */
import "server-only";
import type { JWT } from "next-auth/jwt";

export async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(`${process.env.AUTH_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });
    if (!res.ok) throw new Error(`refresh failed with ${res.status}`);
    const refreshed = await res.json();
    return {
      ...token,
      accessToken: refreshed.accessToken,
      accessTokenExpires: refreshed.accessTokenExpires,
      refreshToken: refreshed.refreshToken ?? token.refreshToken,
      error: undefined,
    };
  } catch {
    // session.error surfaces this; the client forces sign-out on it (§4.1's session callback).
    return { ...token, error: "RefreshAccessTokenError" };
  }
}
