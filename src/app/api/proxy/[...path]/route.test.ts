import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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

async function callRoute(path: string[], init?: { method?: string }) {
  const { GET, POST } = await import("./route");
  const request = new NextRequest(
    `http://localhost/api/proxy/${path.join("/")}`,
    init,
  );
  const handler = (init?.method ?? "GET") === "POST" ? POST : GET;
  return handler(request, { params: Promise.resolve({ path }) });
}

describe("BFF proxy route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("with no session", () => {
    it("returns 401 and never calls the backend", async () => {
      authMock.mockResolvedValue(null);
      cookiesMock.mockResolvedValue(makeCookieStore({}));

      const response = await callRoute(["employees"]);

      expect(response.status).toBe(401);
      expect(callBackendMock).not.toHaveBeenCalled();
    });
  });

  describe("resolving tenant/environment for the backend call", () => {
    it("uses the session's access token and the cookie-resolved tenant/env", async () => {
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

    it("falls back to the session's first tenant when no tenant cookie is set", async () => {
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
  });

  describe("relaying the backend's response", () => {
    it("never relays the backend's own auth/tenant request headers back to the client", async () => {
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
