import { afterEach, describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";

import { refreshAccessToken } from "./refresh-token";

const baseToken: JWT = {
  accessToken: "old-access-token",
  refreshToken: "old-refresh-token",
  accessTokenExpires: Date.now() - 1000, // already expired
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("refreshAccessToken", () => {
  it("rotates the token pair on a successful refresh call", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accessToken: "new-access-token",
          accessTokenExpires: Date.now() + 300_000,
          refreshToken: "new-refresh-token",
        }),
      }),
    );

    const result = await refreshAccessToken(baseToken);

    expect(result.accessToken).toBe("new-access-token");
    expect(result.refreshToken).toBe("new-refresh-token");
    expect(result.error).toBeUndefined();
  });

  it("falls back to the existing refresh token if the response omits one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accessToken: "new-access-token",
          accessTokenExpires: Date.now() + 300_000,
        }),
      }),
    );

    const result = await refreshAccessToken(baseToken);

    expect(result.refreshToken).toBe("old-refresh-token");
  });

  it("sets token.error when the backend rejects the refresh", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );

    const result = await refreshAccessToken(baseToken);

    expect(result.error).toBe("RefreshAccessTokenError");
    // the stale access token is left in place -- session.error is what tells the client to sign out
    expect(result.accessToken).toBe("old-access-token");
  });

  it("sets token.error when the fetch itself throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const result = await refreshAccessToken(baseToken);

    expect(result.error).toBe("RefreshAccessTokenError");
  });
});
