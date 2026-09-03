import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth/auth";
import { callBackend } from "@/lib/backend-client/backend-client.server";
import {
  getActivityCookieOptions,
  resolveLastActiveTimestamp,
  signActivityTimestamp,
  validateSessionState,
} from "@/lib/auth/session-activity.server";
import {
  LAST_ACTIVE_COOKIE_NAME,
  SESSION_ERRORS,
  SESSION_EXPIRY_REASONS,
} from "@/lib/auth/session-constants";
import { normalizeListBody, translateListSearchParams } from "./normalize-list";

/**
 * §6.2: the only place the real backend URL and the real access token meet.
 * Every `endpoint.url` in every form/table schema resolves through here --
 * the browser only ever sees same-origin `/api/proxy/*` (§6.4).
 *
 * Enforces BRD session inactivity (20m) and absolute ceiling (8h).
 */
async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
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
  // Stale companion cookie from a previous session can never precede this session's creation time
  const lastActiveAt = Math.max(sessionCreatedAt, rawLastActiveAt);

  // Enforce server-side session inactivity and absolute limit
  const validation = validateSessionState(sessionCreatedAt, lastActiveAt);
  if (!validation.valid) {
    return NextResponse.json(
      {
        error: "unauthorized",
        code: validation.reason ?? SESSION_EXPIRY_REASONS.INACTIVITY_TIMEOUT,
      },
      { status: 401 },
    );
  }

  const { path } = await params; // Next.js 16: params is a Promise (§4.6)
  const envId = cookieStore.get("admin-environment")?.value ?? "production";
  const tenantId =
    cookieStore.get("admin-tenant")?.value ?? session.user.tenants[0]?.id ?? "";

  const upstream = await callBackend(
    `/${path.join("/")}${translateListSearchParams(request.nextUrl.search)}`,
    {
      method: request.method,
      headers: {
        "Content-Type":
          request.headers.get("content-type") ?? "application/json",
      },
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : await request.text(),
    },
    { accessToken: session.accessToken, envId, tenantId },
  );

  const rawBody = await upstream.text();
  // Only 2xx bodies get shape-normalized -- an error body passes through as
  // whatever the backend actually sent (see the KNOWN GAP note below).
  const body =
    upstream.status >= 200 && upstream.status < 300
      ? normalizeListBody(rawBody)
      : rawBody;

  const response = new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });

  // Distinguish qualifying activity vs background polling:
  // Background polling requests pass `X-Background-Activity: true` and authenticate
  // without extending `lastActiveAt`.
  const isBackground = request.headers.get("x-background-activity") === "true";

  if (!isBackground) {
    const now = Date.now();
    const signed = signActivityTimestamp(now);
    const cookieOpts = getActivityCookieOptions();
    response.cookies.set(cookieOpts.name, signed, cookieOpts);
    response.headers.set("X-Session-Last-Active", String(now));
  }

  return response;
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
