import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

import type { ApiEnvelope } from "@/lib/api-envelope";
import { resolveAccess } from "./resolve-roles";
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
      credentials: { email: {}, username: {}, password: {} },
      authorize: async (credentials) => {
        let baseUrl = (
          process.env.API_URL ||
          // eslint-disable-next-line sonarjs/no-clear-text-protocols
          "http://192.168.0.230:8000/api/v1"
        ).trim();
        while (baseUrl.endsWith("/")) {
          baseUrl = baseUrl.slice(0, -1);
        }

        const res = await fetch(`${baseUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            username: credentials.email || credentials.username,
            password: credentials.password,
          }),
        });

        // Wrong password / unknown user -> NextAuth surfaces a generic auth error.
        if (!res.ok) {
          const errData = await res.text().catch(() => "");
          console.error(
            `[auth] Backend login failed (status ${res.status}):`,
            errData,
          );
          return null;
        }

        const body = (await res.json()) as ApiEnvelope<Record<string, unknown>>;
        const tokenData = (body.data ?? body) as Record<string, unknown>;

        const accessToken =
          (tokenData.access_token as string) ||
          (tokenData.accessToken as string) ||
          "";
        const refreshToken =
          (tokenData.refresh_token as string) ||
          (tokenData.refreshToken as string) ||
          "";
        const accessTokenExpires =
          (tokenData.accessTokenExpires as number) ||
          Date.now() + 60 * 60 * 1000;

        const userObj = (tokenData.user as Record<string, unknown>) || {};
        const emailStr = String(credentials.email || "");
        const user = {
          id: (userObj.id as string) || emailStr || "user-1",
          name:
            (userObj.name as string) ||
            emailStr.split("@")[0] ||
            "Platform User",
          email: (userObj.email as string) || emailStr,
        };

        const access = await resolveAccess(
          {
            user,
            accessToken,
            refreshToken,
            accessTokenExpires,
            roles: (tokenData.roles as string[] | undefined) ?? [
              "platform-admin",
            ],
            permissions: (tokenData.permissions as string[] | undefined) ?? [
              "users.read",
              "users.write",
              "users.invite",
              "users.deactivate",
              "audit.read",
              "settings.read",
              "settings.write",
            ],
            tenants: tokenData.tenants as
              | { id: string; name: string }[]
              | undefined,
          },
          accessToken,
        );

        return {
          id: user.id,
          name: user.name,
          email: user.email,
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
