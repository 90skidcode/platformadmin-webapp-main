import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

import type { ApiEnvelope } from "@/lib/api-envelope";
import { apiEndpoints } from "@/lib/api-endpoints";
import { resolveAccess, type LoginResponse } from "./resolve-roles";
import { refreshAccessToken } from "./refresh-token";
import { decodeJwtPayload } from "./decodeJwt";

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
            body: JSON.stringify({
              username: credentials?.username,
              password: credentials?.password,
            }),
          },
        );

        // Wrong password / unknown user -> NextAuth surfaces a generic auth error.
        if (!res.ok) return null;

        const body = (await res.json()) as ApiEnvelope<LoginResponse>;
        const data = body.data;

        const accessToken = data.access_token ?? data.accessToken ?? "";
        const refreshToken = data.refresh_token ?? data.refreshToken ?? "";
        const claims = decodeJwtPayload(accessToken);

        const username =
          data.user?.username ??
          claims?.sub ??
          (typeof credentials?.username === "string"
            ? credentials.username
            : "admin");

        const id = data.user?.id ?? claims?.sub ?? username;
        const name = data.user?.name ?? username;
        const email = data.user?.email;

        // Expiration in ms (from JWT exp in seconds, or response, or default 15m)
        const accessTokenExpires =
          data.accessTokenExpires ??
          (claims?.exp ? claims.exp * 1000 : Date.now() + 15 * 60 * 1000);

        // Optional role/tenant resolution (safely returns empty arrays if not present)
        const access = await resolveAccess(data, accessToken);

        return {
          id,
          name,
          username,
          email,
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
      session.user.username = (token.username as string) ?? token.id;
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
