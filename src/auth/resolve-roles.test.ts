import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveAccess, type LoginResponse } from "./resolve-roles";

const baseLogin: LoginResponse = {
  user: { id: "user-1", name: "Priya Sharma", email: "admin@platform.local" },
  accessToken: "access-token",
  refreshToken: "refresh-token",
  accessTokenExpires: Date.now() + 60_000,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("resolveAccess", () => {
  it("uses roles/permissions embedded directly in the login response", async () => {
    const result = await resolveAccess(
      {
        ...baseLogin,
        roles: ["platform-admin"],
        permissions: ["users.read"],
        tenants: [{ id: "acme", name: "Acme" }],
      },
      "access-token",
    );
    expect(result).toEqual({
      roles: ["platform-admin"],
      permissions: ["users.read"],
      tenants: [{ id: "acme", name: "Acme" }],
    });
  });

  it("falls back to a separate /me endpoint when the login response has neither", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        roles: ["viewer"],
        permissions: ["employees.read"],
        tenants: [{ id: "acme", name: "Acme" }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveAccess(baseLogin, "access-token");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/me"),
      expect.objectContaining({
        headers: { Authorization: "Bearer access-token" },
      }),
    );
    expect(result).toEqual({
      roles: ["viewer"],
      permissions: ["employees.read"],
      tenants: [{ id: "acme", name: "Acme" }],
    });
  });

  it("defaults to empty arrays, without throwing, when /me also fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await resolveAccess(baseLogin, "access-token");

    expect(result).toEqual({ roles: [], permissions: [], tenants: [] });
  });

  it("defaults to empty arrays when the /me fetch itself rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await resolveAccess(baseLogin, "access-token");

    expect(result).toEqual({ roles: [], permissions: [], tenants: [] });
  });
});
