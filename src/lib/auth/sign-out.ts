"use client";

import { signOut } from "next-auth/react";

import { deleteCookie } from "@/lib/utils/cookies";
import { LAST_ACTIVE_COOKIE_NAME } from "./session-constants";

/**
 * Clears the environment/tenant/inactivity cookies -- a fresh sign-in
 * shouldn't inherit the previous session's switcher or activity state (plan §5) --
 * then hands off to NextAuth's `signOut()`, which redirects to `/login`.
 *
 * Shared by Topbar's manual "Sign out", the Inactivity Watcher modal,
 * and the API fetcher's forced sign-out on a 401.
 */
export function clearSessionCookiesAndSignOut(callbackUrl = "/login") {
  deleteCookie("admin-environment");
  deleteCookie("admin-tenant");
  deleteCookie(LAST_ACTIVE_COOKIE_NAME);
  return signOut({ callbackUrl });
}
