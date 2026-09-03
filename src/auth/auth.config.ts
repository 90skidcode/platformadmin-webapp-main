import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin, type NextAuthConfig } from "next-auth";

import { parseApiErrorMessage, type ApiEnvelope } from "@/lib/api-envelope";
import { apiEndpoints } from "@/lib/api-endpoints";
import {
  ABSOLUTE_TIMEOUT_MS,
  INACTIVITY_TIMEOUT_MS,
  SESSION_ERRORS,
  WARNING_TIME_MS,
} from "@/lib/auth/session-constants";
import { resolveAccess, type LoginResponse } from "./resolve-roles";
import { refreshAccessToken } from "./refresh-token";
import { decodeJwtPayload } from "./decode-jwt";

/** `CredentialsSignin`'s own constructor hardcodes `code = "credentials"` --
 * Auth.js's client only ever gets this `code` field back (never a free-form
 * `message`) across the redirect round-trip, so this is the one channel
 * available for the backend's actual reason ("account locked", "invalid
 * password", ...) to reach the login page's toast (login/page.tsx). */
class ApiCredentialsError extends CredentialsSignin {
  constructor(message: string) {
    super();
    this.code = message;
  }
}

/** Real backend's actual `/auth/login` shape -- `email`/`password` in (the
 * new standard the backend team settled on, superseding the `username` key
 * an earlier live response had required), a bare token pair out. No `user`,
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
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        try {
          const res = await fetch(
            `${process.env.API_URL}${apiEndpoints.auth.login}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(credentials),
            },
          );
          // Wrong password, unknown user, locked account, ... -- whatever the
          // backend's `message` says, forwarded verbatim to the login page's
          // toast via ApiCredentialsError's `code` (see its own doc comment).
          if (!res.ok) {
            const errorBody = await res.json().catch(() => null);
            console.error("[auth] /auth/login failed", res.status, errorBody);
            throw new ApiCredentialsError(
              parseApiErrorMessage(errorBody, res.status),
            );
          }

          const body = (await res.json()) as ApiEnvelope<RealLoginData>;
          const accessToken = body.data.access_token;
          const refreshToken = body.data.refresh_token;

          // No `exp` on the envelope itself -- it's inside the access token's
          // own JWT payload. `sub` doubles as the only identity the backend
          // gives us, since there's no `user` object either.
          const payload = decodeJwtPayload(accessToken);
          const email =
            (payload?.sub as string | undefined) ??
            (credentials?.email as string | undefined) ??
            "unknown";
          const accessTokenExpires =
            typeof payload?.exp === "number"
              ? payload.exp * 1000
              : Date.now() + 15 * 60_000; // fallback if the token has no exp claim

          const loginResponse: LoginResponse = {
            user: { id: email, name: email, email },
            accessToken,
            refreshToken,
            accessTokenExpires,
          };
          // Backend has no roles/permissions/tenants source yet (no `/me`
          // either) -- resolveAccess falls back to empty arrays, which is
          // fine: RBAC gating itself is disabled for now (permissions.ts).
          const access = await resolveAccess(loginResponse, accessToken);

          const now = Date.now();
          return {
            id: loginResponse.user.id,
            name: loginResponse.user.name,
            email: loginResponse.user.email,
            ...access,
            accessToken,
            refreshToken,
            accessTokenExpires,
            sessionCreatedAt: now,
            lastActiveAt: now,
          };
        } catch (err) {
          // ApiCredentialsError is already logged above with its backend
          // status/body -- only unexpected failures (network down, bad JSON,
          // resolveAccess throwing, ...) need a second, distinct log line.
          if (!(err instanceof ApiCredentialsError)) {
            console.error("[auth] authorize() threw", err);
          }
          throw err;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) return { ...token, ...user }; // first sign-in: seed from authorize()

      // Absolute 8-hour ceiling from original login (never extended)
      if (
        typeof token.sessionCreatedAt === "number" &&
        Date.now() - token.sessionCreatedAt >= ABSOLUTE_TIMEOUT_MS
      ) {
        return { ...token, error: SESSION_ERRORS.EXPIRED };
      }

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
      session.sessionCreatedAt = token.sessionCreatedAt as number | undefined;
      session.lastActiveAt = token.lastActiveAt as number | undefined;
      session.inactivityTimeoutMs = INACTIVITY_TIMEOUT_MS;
      session.warningTimeMs = WARNING_TIME_MS;
      session.absoluteTimeoutMs = ABSOLUTE_TIMEOUT_MS;
      session.error = token.error as
        | "RefreshAccessTokenError"
        | typeof SESSION_ERRORS.EXPIRED
        | undefined;
      return session;
    },
  },
};
