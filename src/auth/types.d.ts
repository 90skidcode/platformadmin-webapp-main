import type {} from "next-auth";

// Normalizes every downstream consumer (Sidebar, action `permission` gates,
// route checks) onto one shape, regardless of which branch of
// `resolve-roles.ts` filled it in (plan §4.2/§5).
//
// `Session.user` is declared as its own explicit shape rather than
// `DefaultSession["user"] & {...}` -- next-auth's core `DefaultSession`
// resolves its `user` field through the module's (augmented) `User`
// interface, so extending it here would also pull in `User`'s
// authorize()-only fields (accessToken/refreshToken/accessTokenExpires),
// which a session's `user` never carries (those live on `session.accessToken`
// directly, set from the JWT in the `session` callback).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      roles: string[];
      permissions: string[];
      tenants: { id: string; name: string }[];
    };
    accessToken: string;
    error?: "RefreshAccessTokenError";
  }

  interface User {
    id: string;
    roles: string[];
    permissions: string[];
    tenants: { id: string; name: string }[];
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    roles?: string[];
    permissions?: string[];
    tenants?: { id: string; name: string }[];
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: "RefreshAccessTokenError";
  }
}
