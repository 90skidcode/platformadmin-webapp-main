import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

import type { ApiEnvelope } from "@/lib/api-envelope";
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
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const res = await fetch(`${process.env.AUTH_API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });
        // Wrong password / unknown user -> NextAuth surfaces a generic auth error.
        if (!res.ok) return null;

        const body = (await res.json()) as ApiEnvelope<LoginResponse>;
        const data = body.data;
        const access = await resolveAccess(data, data.accessToken);

        return {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          ...access,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          accessTokenExpires: data.accessTokenExpires,
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
