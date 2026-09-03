import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { signActivityTimestamp } from "@/lib/auth/session-activity.server";
import {
  ABSOLUTE_TIMEOUT_MS,
  INACTIVITY_TIMEOUT_MS,
  LAST_ACTIVE_COOKIE_NAME,
  SESSION_ERRORS,
} from "@/lib/auth/session-constants";

const authMock = vi.fn();
const cookiesMock = vi.fn();
const callBackendMock = vi.fn();

vi.mock("@/auth/auth", () => ({ auth: () => authMock() }));
vi.mock("next/headers", () => ({ cookies: () => cookiesMock() }));
vi.mock("@/lib/backend-client/backend-client.server", () => ({
  callBackend: (...args: unknown[]) => callBackendMock(...args),
}));

function makeCookieStore(values: Record<string, string>) {
  return {
    get: (name: string) => (values[name] ? { value: values[name] } : undefined),
  };
}

async function callRoute(
  path: string[],
  init?: { method?: string; headers?: Record<string, string> },
) {
  const { GET, POST } = await import("./route");
  const request = new NextRequest(
    `http://localhost/api/proxy/${path.join("/")}`,
    init,
  );
  const handler = (init?.method ?? "GET") === "POST" ? POST : GET;
  return handler(request, { params: Promise.resolve({ path }) });
}

describe("BRD: BFF Proxy Session Guard & Activity Tracking", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("Session Validity & Access Control", () => {
    it("blocks backend API access and returns 401 when no authenticated user session exists", async () => {
      authMock.mockResolvedValue(null);
      cookiesMock.mockResolvedValue(makeCookieStore({}));

      const response = await callRoute(["employees"]);

      expect(response.status).toBe(401);
      expect(callBackendMock).not.toHaveBeenCalled();
    });

    it("blocks backend API access and returns 401 when user session has already expired", async () => {
      authMock.mockResolvedValue({
        accessToken: "tok",
        error: SESSION_ERRORS.EXPIRED,
      });
      cookiesMock.mockResolvedValue(makeCookieStore({}));

      const response = await callRoute(["employees"]);

      expect(response.status).toBe(401);
      expect(callBackendMock).not.toHaveBeenCalled();
    });

    it("blocks backend API access and returns 401 when user inactivity has reached or exceeded 10 minutes", async () => {
      const now = Date.now();
      const lastActive = now - (INACTIVITY_TIMEOUT_MS + 5000); // inactive

      authMock.mockResolvedValue({
        accessToken: "tok",
        sessionCreatedAt: now - 30 * 60 * 1000,
        lastActiveAt: lastActive,
        user: { tenants: [] },
      });
      cookiesMock.mockResolvedValue(
        makeCookieStore({
          [LAST_ACTIVE_COOKIE_NAME]: signActivityTimestamp(lastActive),
        }),
      );

      const response = await callRoute(["employees"]);

      expect(response.status).toBe(401);
      expect(callBackendMock).not.toHaveBeenCalled();
    });

    it("blocks backend API access and returns 401 when the session reaches the 8-hour absolute maximum limit", async () => {
      const now = Date.now();
      const sessionCreatedAt = now - (ABSOLUTE_TIMEOUT_MS + 5000); // > 8 hours ago
      const lastActive = now - 1000; // active recently

      authMock.mockResolvedValue({
        accessToken: "tok",
        sessionCreatedAt,
        lastActiveAt: lastActive,
        user: { tenants: [] },
      });
      cookiesMock.mockResolvedValue(
        makeCookieStore({
          [LAST_ACTIVE_COOKIE_NAME]: signActivityTimestamp(lastActive),
        }),
      );

      const response = await callRoute(["employees"]);

      expect(response.status).toBe(401);
      expect(callBackendMock).not.toHaveBeenCalled();
    });
  });

  describe("Qualifying User Activity vs Background Polling Isolation", () => {
    it("updates the session activity cookie and returns last-active header on user-initiated actions", async () => {
      const now = Date.now();
      authMock.mockResolvedValue({
        accessToken: "tok",
        sessionCreatedAt: now - 60000,
        lastActiveAt: now - 60000,
        user: { tenants: [] },
      });
      cookiesMock.mockResolvedValue(
        makeCookieStore({
          [LAST_ACTIVE_COOKIE_NAME]: signActivityTimestamp(now - 60000),
        }),
      );
      callBackendMock.mockResolvedValue(new Response("{}", { status: 200 }));

      const response = await callRoute(["employees"]);

      expect(response.status).toBe(200);
      expect(response.headers.get("X-Session-Last-Active")).toBeTruthy();
      expect(response.cookies.get(LAST_ACTIVE_COOKIE_NAME)).toBeTruthy();
    });

    it("authenticates background polling requests without resetting or extending the user inactivity timer", async () => {
      const now = Date.now();
      authMock.mockResolvedValue({
        accessToken: "tok",
        sessionCreatedAt: now - 60000,
        lastActiveAt: now - 60000,
        user: { tenants: [] },
      });
      cookiesMock.mockResolvedValue(
        makeCookieStore({
          [LAST_ACTIVE_COOKIE_NAME]: signActivityTimestamp(now - 60000),
        }),
      );
      callBackendMock.mockResolvedValue(new Response("{}", { status: 200 }));

      const response = await callRoute(["employees"], {
        headers: { "x-background-activity": "true" },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("X-Session-Last-Active")).toBeNull();
      expect(response.cookies.get(LAST_ACTIVE_COOKIE_NAME)).toBeUndefined();
    });
  });

  describe("Backend Context Forwarding & Data Relaying", () => {
    it("forwards the active tenant and environment context with the upstream request", async () => {
      authMock.mockResolvedValue({
        accessToken: "session-token",
        user: { tenants: [{ id: "acme", name: "Acme" }] },
      });
      cookiesMock.mockResolvedValue(
        makeCookieStore({
          "admin-environment": "staging",
          "admin-tenant": "acme",
        }),
      );
      callBackendMock.mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      const response = await callRoute(["employees"]);

      expect(response.status).toBe(200);
      expect(callBackendMock).toHaveBeenCalledWith(
        "/employees",
        expect.objectContaining({ method: "GET" }),
        { accessToken: "session-token", envId: "staging", tenantId: "acme" },
      );
    });

    it("falls back to the user's primary assigned tenant when no explicit tenant selection is made", async () => {
      authMock.mockResolvedValue({
        accessToken: "session-token",
        user: { tenants: [{ id: "globex", name: "Globex" }] },
      });
      cookiesMock.mockResolvedValue(makeCookieStore({}));
      callBackendMock.mockResolvedValue(new Response("{}", { status: 200 }));

      await callRoute(["employees"]);

      expect(callBackendMock).toHaveBeenCalledWith(
        "/employees",
        expect.anything(),
        expect.objectContaining({ envId: "production", tenantId: "globex" }),
      );
    });

    it("protects internal upstream credentials by never exposing backend-internal response headers to the client", async () => {
      authMock.mockResolvedValue({ accessToken: "t", user: { tenants: [] } });
      cookiesMock.mockResolvedValue(makeCookieStore({}));
      callBackendMock.mockResolvedValue(
        new Response("{}", {
          status: 200,
          headers: {
            "content-type": "application/json",
            "x-upstream-secret": "leak",
          },
        }),
      );

      const response = await callRoute(["employees"]);

      expect(response.headers.get("x-upstream-secret")).toBeNull();
      expect(response.headers.get("content-type")).toBe("application/json");
    });
  });
});
