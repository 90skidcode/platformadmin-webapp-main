"use client";

import { signOut } from "next-auth/react";

import { deleteCookie } from "@/lib/utils/cookies";

/**
 * Clears the environment/tenant switcher cookies -- a fresh sign-in
 * shouldn't inherit the previous session's switcher state (plan §5) --
 * then hands off to NextAuth's `signOut()`, which redirects to `/login`.
 *
 * Shared by the Topbar's manual "Sign out" menu item and the API fetcher's
 * forced sign-out on a 401 (session gone, or the backend rejected the
 * access token past the point a refresh could recover it).
 */
export function clearSessionCookiesAndSignOut() {
  deleteCookie("admin-environment");
  deleteCookie("admin-tenant");
  return signOut({ callbackUrl: "/login" });
}
