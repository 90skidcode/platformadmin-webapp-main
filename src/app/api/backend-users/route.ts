import { NextResponse, type NextRequest } from "next/server";

const BACKEND_BASE_URL = process.env.LIVE_BACKEND_URL;

export async function GET(request: NextRequest) {
  const token =
    request.headers.get("authorization") ||
    request.headers.get("x-backend-token") ||
    "";

  const searchParams = request.nextUrl.search;
  const upstreamUrl = `${BACKEND_BASE_URL}/api/v1/users${searchParams}`;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization: token.startsWith("Bearer ")
                ? token
                : `Bearer ${token}`,
            }
          : {}),
      },
      signal: AbortSignal.timeout(10000),
    });

    const body = await upstreamRes.json().catch(() => ({}));
    return NextResponse.json(body, { status: upstreamRes.status });
  } catch (error) {
    console.error("Failed to connect to live backend:", error);
    return NextResponse.json(
      {
        code: "E_502_BACKEND_UNREACHABLE",
        message:
          "Could not reach backend at " +
          BACKEND_BASE_URL +
          ". Make sure the FastAPI server is running and reachable on your Wi-Fi.",
        data: null,
      },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const credentials = await request.json();
    const upstreamRes = await fetch(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
      signal: AbortSignal.timeout(10000),
    });

    console.log("Upstream response status:", upstreamRes.status);

    const body = await upstreamRes.json().catch(() => ({}));
    return NextResponse.json(body, { status: upstreamRes.status });
  } catch (error) {
    console.error("Failed to authenticate with live backend:", error);
    return NextResponse.json(
      {
        code: "E_502_BACKEND_UNREACHABLE",
        message:
          "Could not reach backend at " +
          BACKEND_BASE_URL +
          ". Make sure the FastAPI server is running and reachable on your Wi-Fi.",
        data: null,
      },
      { status: 502 },
    );
  }
}
