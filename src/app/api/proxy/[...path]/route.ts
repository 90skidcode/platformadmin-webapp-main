import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import { auth } from "@/auth/auth";
import { callBackend } from "@/lib/backend-client/backend-client.server";
import { normalizeListBody, translateListSearchParams } from "./normalize-list";

/**
 * §6.2: the only place the real backend URL and the real access token meet.
 * Every `endpoint.url` in every form/table schema resolves through here --
 * the browser only ever sees same-origin `/api/proxy/*` (§6.4).
 */
async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { path } = await params; // Next.js 16: params is a Promise (§4.6)
  const cookieStore = await cookies();
  const envId = cookieStore.get("admin-environment")?.value ?? "production";
  const tenantId =
    cookieStore.get("admin-tenant")?.value ?? session.user.tenants[0]?.id ?? "";

  const emailHeader = request.headers.get("email");
  const upstream = await callBackend(
    `/${path.join("/")}${translateListSearchParams(request.nextUrl.search)}`,
    {
      method: request.method,
      headers: {
        "Content-Type":
          request.headers.get("content-type") ?? "application/json",
        ...(emailHeader ? { Email: emailHeader } : {}),
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

  // KNOWN GAP, tracked in §6.4: non-2xx backend errors should map to a
  // generic shape before returning them. Fine for this repo's own mock
  // backend; not fine for a real upstream that might relay a stack trace.
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
