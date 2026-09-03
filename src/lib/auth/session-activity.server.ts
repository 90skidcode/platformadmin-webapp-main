import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

import {
  ABSOLUTE_TIMEOUT_MS,
  INACTIVITY_TIMEOUT_MS,
  LAST_ACTIVE_COOKIE_NAME,
  SESSION_EXPIRY_REASONS,
  type SessionExpiryReason,
} from "./session-constants";

function getSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    "platformadmin-auth-secret-key-fallback-for-dev-and-testing"
  );
}

/**
 * Signs a numeric timestamp with HMAC-SHA256: `<timestamp>.<signature>`
 */
export function signActivityTimestamp(timestamp: number): string {
  const hmac = crypto
    .createHmac("sha256", getSecret())
    .update(String(timestamp))
    .digest("hex");
  return `${timestamp}.${hmac}`;
}

/**
 * Verifies an HMAC-signed timestamp. Returns the numeric timestamp if valid and untampered,
 * or null if invalid or missing.
 */
export function verifyActivityTimestamp(
  signedValue: string | undefined | null,
): number | null {
  if (!signedValue || typeof signedValue !== "string") return null;

  const dotIndex = signedValue.indexOf(".");
  if (dotIndex === -1) return null;

  const rawTimestamp = signedValue.slice(0, dotIndex);
  const providedHmac = signedValue.slice(dotIndex + 1);

  const timestamp = Number(rawTimestamp);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;

  const expectedHmac = crypto
    .createHmac("sha256", getSecret())
    .update(rawTimestamp)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  if (providedHmac.length !== expectedHmac.length) return null;
  const match = crypto.timingSafeEqual(
    Buffer.from(providedHmac, "utf-8"),
    Buffer.from(expectedHmac, "utf-8"),
  );

  return match ? timestamp : null;
}

export interface SessionValidationResult {
  valid: boolean;
  reason?: SessionExpiryReason;
}

/**
 * Validates session state against:
 * 1. 8-hour absolute maximum limit from initial login (`sessionCreatedAt`)
 * 2. Inactivity limit (`lastActiveAt`)
 */
export function validateSessionState(
  sessionCreatedAt: number,
  lastActiveAt: number,
  now = Date.now(),
): SessionValidationResult {
  // 1. Check absolute 8-hour limit from original login (never extended)
  if (now - sessionCreatedAt >= ABSOLUTE_TIMEOUT_MS) {
    return {
      valid: false,
      reason: SESSION_EXPIRY_REASONS.ABSOLUTE_LIMIT_REACHED,
    };
  }

  // 2. Check inactivity limit
  if (now - lastActiveAt >= INACTIVITY_TIMEOUT_MS) {
    return {
      valid: false,
      reason: SESSION_EXPIRY_REASONS.INACTIVITY_TIMEOUT,
    };
  }

  return { valid: true };
}

/**
 * Resolves the effective `lastActiveAt` timestamp from the signed cookie,
 * falling back to the session's own initial timestamp if the cookie is not yet set.
 */
export function resolveLastActiveTimestamp(
  cookieValue: string | undefined | null,
  fallbackTimestamp: number,
): number {
  const verified = verifyActivityTimestamp(cookieValue);
  return verified !== null ? verified : fallbackTimestamp;
}

/**
 * Resolves the initial lastActiveAt timestamp for Server Components (e.g. AdminLayout).
 *
 * Reads the signed `admin-last-active` cookie from incoming request headers, validates
 * its HMAC signature, and ensures it is bounded by `sessionCreatedAt`.
 */
export async function getInitialLastActiveAt(
  session:
    | {
        sessionCreatedAt?: number;
        lastActiveAt?: number;
      }
    | null
    | undefined,
): Promise<number> {
  const cookieStore = await cookies();
  const sessionCreatedAt = session?.sessionCreatedAt ?? 0;
  const lastActiveCookie = cookieStore.get(LAST_ACTIVE_COOKIE_NAME)?.value;
  const rawLastActiveAt = resolveLastActiveTimestamp(
    lastActiveCookie,
    session?.lastActiveAt ?? sessionCreatedAt,
  );
  return Math.max(sessionCreatedAt, rawLastActiveAt);
}

/**
 * Standard cookie options for `admin-last-active`.
 */
export function getActivityCookieOptions() {
  return {
    name: LAST_ACTIVE_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(ABSOLUTE_TIMEOUT_MS / 1000), // Max 8 hours
  };
}
