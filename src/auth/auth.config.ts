import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

import type { ApiEnvelope } from "@/lib/api-envelope";
import { apiEndpoints } from "@/lib/api-endpoints";
import { resolveAccess, type LoginResponse } from "./resolve-roles";
import { refreshAccessToken } from "./refresh-token";

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
      credentials: { username: {}, email: {}, password: {} },
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

        const body = (await res.json()) as
          | ApiEnvelope<LoginResponse>
          | LoginResponse
          | Record<string, unknown>;
        const data: LoginResponse =
          body && typeof body === "object" && "data" in body && body.data
            ? (body.data as LoginResponse)
            : (body as LoginResponse);

        const accessToken =
          data.accessToken ??
          ((data as Record<string, unknown>).token as string) ??
          ((data as Record<string, unknown>).access_token as string) ??
          "";
        const access = await resolveAccess(data, accessToken);

        const userObj =
          data.user ??
          (data as unknown as {
            id?: string;
            name?: string;
            email?: string;
            username?: string;
          });
        let credUsername = "";
        if (typeof credentials?.username === "string") {
          credUsername = credentials.username;
        } else if (typeof credentials?.email === "string") {
          credUsername = credentials.email;
        }

        let fallbackEmail = credUsername;
        if (userObj?.username) {
          fallbackEmail = `${userObj.username}@platform.local`;
        }

        return {
          id: userObj?.id ?? userObj?.username ?? credUsername ?? "user-1",
          name: userObj?.name ?? userObj?.username ?? credUsername ?? "User",
          email: userObj?.email ?? fallbackEmail,
          ...access,
          accessToken,
          refreshToken:
            data.refreshToken ??
            ((data as Record<string, unknown>).refresh_token as string) ??
            "",
          accessTokenExpires:
            data.accessTokenExpires ?? Date.now() + 24 * 60 * 60 * 1000,
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
