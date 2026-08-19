import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

import type { ApiEnvelope } from "@/lib/api-envelope";
import { apiEndpoints } from "@/lib/api-endpoints";
import { resolveAccess, type LoginResponse } from "./resolve-roles";
import { refreshAccessToken } from "./refresh-token";
import { decodeJwtPayload } from "./decode-jwt";

/** Real backend's actual `/auth/login` shape (confirmed against a live
 * response) -- `username`/`password` in, a bare token pair out. No `user`,
 * no `roles`/`permissions`, no `accessTokenExpires`: none of the plan's
 * assumed extras (see mocks/db.ts's "swapping in a real backend means
 * changing API_URL, nothing else" comment) actually held, hence the
 * translation below instead of a straight passthrough. */
interface RealLoginData {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Platforms like Vercel/Netlify set AUTH_TRUST_HOST automatically; a
  // self-hosted deployment (this repo's own `next start`, Docker, etc.)
  // needs it set explicitly or every request in production mode fails
  // NextAuth's Host-header trust check with an UntrustedHost error --
  // caught for real running `pnpm e2e` against a production build.
  trustHost: true,
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      authorize: async (credentials) => {
        const res = await fetch(
          `${process.env.API_URL}${apiEndpoints.auth.login}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
          },
        );
        // Wrong password / unknown user -> NextAuth surfaces a generic auth error.
        if (!res.ok) return null;

        const body = (await res.json()) as ApiEnvelope<RealLoginData>;
        const accessToken = body.data.access_token;
        const refreshToken = body.data.refresh_token;

        // No `exp` on the envelope itself -- it's inside the access token's
        // own JWT payload. `sub` doubles as the only identity the backend
        // gives us, since there's no `user` object either.
        const payload = decodeJwtPayload(accessToken);
        const username =
          (payload?.sub as string | undefined) ??
          (credentials?.username as string | undefined) ??
          "unknown";
        const accessTokenExpires =
          typeof payload?.exp === "number"
            ? payload.exp * 1000
            : Date.now() + 15 * 60_000; // fallback if the token has no exp claim

        const loginResponse: LoginResponse = {
          user: { id: username, name: username, email: username },
          accessToken,
          refreshToken,
          accessTokenExpires,
        };
        // Backend has no roles/permissions/tenants source yet (no `/me`
        // either) -- resolveAccess falls back to empty arrays, which is
        // fine: RBAC gating itself is disabled for now (permissions.ts).
        const access = await resolveAccess(loginResponse, accessToken);

        return {
          id: loginResponse.user.id,
          name: loginResponse.user.name,
          email: loginResponse.user.email,
          ...access,
          accessToken,
          refreshToken,
          accessTokenExpires,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) return { ...token, ...user }; // first sign-in: seed from authorize()
      if (Date.now() < (token.accessTokenExpires as number)) return token;
      return refreshAccessToken(token); // rotate before the backend token expires
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.roles = (token.roles as string[]) ?? [];
      session.user.permissions = (token.permissions as string[]) ?? [];
      session.user.tenants =
        (token.tenants as { id: string; name: string }[]) ?? [];
      session.accessToken = token.accessToken as string;
      session.error = token.error as "RefreshAccessTokenError" | undefined; // client forces sign-out on this
      return session;
    },
  },
};
