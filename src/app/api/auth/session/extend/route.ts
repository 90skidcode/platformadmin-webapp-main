import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth/auth";
import {
  getActivityCookieOptions,
  resolveLastActiveTimestamp,
  signActivityTimestamp,
  validateSessionState,
} from "@/lib/auth/session-activity.server";
import {
  ABSOLUTE_TIMEOUT_MS,
  INACTIVITY_TIMEOUT_MS,
  LAST_ACTIVE_COOKIE_NAME,
  SESSION_ERRORS,
  SESSION_EXPIRY_REASONS,
} from "@/lib/auth/session-constants";

/**
 * Handles explicit "Continue Session" action from the 18-minute inactivity warning modal.
 *
 * Requirements:
 * - Resets/extends the inactivity timeout ONLY when the session is still eligible.
 * - If the session has already expired (>20m inactivity) or reached the 8-hour absolute ceiling,
 *   extension is rejected with 401.
 */
export async function POST() {
  const session = await auth();
  if (!session || session.error === SESSION_ERRORS.EXPIRED) {
    return NextResponse.json(
      {
        error: "unauthorized",
        code: SESSION_EXPIRY_REASONS.INACTIVITY_TIMEOUT,
      },
      { status: 401 },
    );
  }

  const cookieStore = await cookies();
  const sessionCreatedAt = session.sessionCreatedAt ?? Date.now();
  const lastActiveCookie = cookieStore.get(LAST_ACTIVE_COOKIE_NAME)?.value;
  const rawLastActiveAt = resolveLastActiveTimestamp(
    lastActiveCookie,
    session.lastActiveAt ?? sessionCreatedAt,
  );
  const lastActiveAt = Math.max(sessionCreatedAt, rawLastActiveAt);

  const now = Date.now();
  const validation = validateSessionState(sessionCreatedAt, lastActiveAt, now);

  if (!validation.valid) {
    return NextResponse.json(
      {
        error: "unauthorized",
        code: validation.reason ?? SESSION_EXPIRY_REASONS.INACTIVITY_TIMEOUT,
      },
      { status: 401 },
    );
  }

  // Session is eligible: bump lastActiveAt to now
  const signed = signActivityTimestamp(now);
  const cookieOpts = getActivityCookieOptions();
  const absoluteExpiresAt = sessionCreatedAt + ABSOLUTE_TIMEOUT_MS;
  const expiresIn = Math.min(
    INACTIVITY_TIMEOUT_MS,
    Math.max(0, absoluteExpiresAt - now),
  );

  const response = NextResponse.json(
    {
      code: "S_200_SESSION_EXTENDED",
      message: "Session extended successfully",
      data: {
        lastActiveAt: now,
        sessionCreatedAt,
        expiresIn,
        absoluteExpiresAt,
      },
    },
    { status: 200 },
  );

  response.cookies.set(cookieOpts.name, signed, cookieOpts);
  response.headers.set("X-Session-Last-Active", String(now));

  return response;
}
