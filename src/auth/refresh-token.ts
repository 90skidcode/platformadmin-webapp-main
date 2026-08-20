/** Rotates the backend access token before it expires (plan §4.3). Assumes
 * the backend exposes `POST /auth/refresh` accepting `{ refreshToken }` --
 * flagged as an open assumption in plan §19 until confirmed. */
import "server-only";
import type { JWT } from "next-auth/jwt";

import type { ApiEnvelope } from "@/lib/api-envelope";
import { apiEndpoints } from "@/lib/api-endpoints";

interface RefreshData {
  access_token?: string;
  accessToken?: string;
  refresh_token?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
}

function parseJwtExp(token?: string): number | undefined {
  try {
    if (!token) return undefined;
    const parts = token.split(".");
    if (parts.length < 2) return undefined;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

export async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(
      `${process.env.API_URL}${apiEndpoints.auth.refresh}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refresh_token: token.refreshToken,
          refreshToken: token.refreshToken,
        }),
      },
    );
    if (!res.ok) throw new Error(`refresh failed with ${res.status}`);
    const body = (await res.json()) as ApiEnvelope<RefreshData>;
    const refreshed = body.data;

    const accessToken =
      refreshed.access_token ??
      refreshed.accessToken ??
      (token.accessToken as string);

    const accessTokenExpires =
      refreshed.accessTokenExpires ??
      parseJwtExp(accessToken) ??
      (token.accessTokenExpires as number);

    const refreshToken =
      refreshed.refresh_token ??
      refreshed.refreshToken ??
      (token.refreshToken as string);

    return {
      ...token,
      accessToken,
      accessTokenExpires,
      refreshToken,
      error: undefined,
    };
  } catch {
    // session.error surfaces this; the client forces sign-out on it (§4.1's session callback).
    return { ...token, error: "RefreshAccessTokenError" };
  }
}
