import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("callBackend", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("API_URL", "https://api.backend.example");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("builds the upstream URL from API_URL and attaches auth/tenant headers", async () => {
    const { callBackend } = await import("./backend-client.server");
    await callBackend(
      "/employees",
      { method: "GET" },
      { accessToken: "token-123", envId: "production", tenantId: "acme" },
    );

    expect(fetch).toHaveBeenCalledWith(
      "https://api.backend.example/employees",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "X-Tenant-Id": "acme",
        }),
      }),
    );
  });
});
