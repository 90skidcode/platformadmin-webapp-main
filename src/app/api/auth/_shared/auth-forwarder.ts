import { NextResponse, type NextRequest } from "next/server";

import { resolveBaseUrl } from "@/lib/backend-client/environment-config.server";

/**
 * Shared forwarder for public auth endpoints (pre-login flow).
 *
 * No session or access token required. Proxies the raw request body to the
 * backend and relays the response status and body back to the client.
 * Returns 503 when the backend is unreachable.
 */
export async function forwardAuthRequest(
  request: NextRequest,
  backendPath: string,
): Promise<NextResponse> {
  const body = await request.text();
  const baseUrl = resolveBaseUrl("");

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}${backendPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch {
    return NextResponse.json(
      {
        code: "E_503_UPSTREAM_UNAVAILABLE",
        message: "Service unavailable",
        data: null,
      },
      { status: 503 },
    );
  }

  const responseBody = await upstream.text();
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
