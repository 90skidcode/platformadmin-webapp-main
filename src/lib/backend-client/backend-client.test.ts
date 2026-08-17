import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("callBackend", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("API_URL_DEV", "https://dev.backend.example");
    vi.stubEnv("API_URL_STAGING", "https://staging.backend.example");
    vi.stubEnv("API_URL_PROD", "https://api.backend.example");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("builds the upstream URL from the resolved environment and attaches auth/tenant headers", async () => {
    const { callBackend } = await import("./backend-client.server");
    await callBackend(
      "/employees",
      { method: "GET" },
      { accessToken: "token-123", envId: "staging", tenantId: "acme" },
    );

    expect(fetch).toHaveBeenCalledWith(
      "https://staging.backend.example/employees",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "X-Tenant-Id": "acme",
        }),
      }),
    );
  });

  it("falls back to production for an unknown envId instead of throwing", async () => {
    const { callBackend } = await import("./backend-client.server");
    await callBackend(
      "/employees",
      { method: "GET" },
      { accessToken: "t", envId: "bogus", tenantId: "" },
    );

    expect(fetch).toHaveBeenCalledWith(
      "https://api.backend.example/employees",
      expect.anything(),
    );
  });
});
