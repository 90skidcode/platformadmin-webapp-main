/* eslint-disable sonarjs/no-hardcoded-secrets, sonarjs/no-hardcoded-passwords -- dummy mock credentials and tokens for authConfig unit tests */
import { afterEach, describe, expect, it, vi } from "vitest";

import { authConfig } from "./auth.config";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("authConfig", () => {
  describe("authorize callback", () => {
    const provider = authConfig.providers[0];
    const providerObj = (
      typeof provider === "function" ? provider() : provider
    ) as
      | {
          options?: {
            authorize?: (
              credentials: Record<string, unknown>,
              req: never,
            ) => Promise<unknown>;
          };
          authorize?: (
            credentials: Record<string, unknown>,
            req: never,
          ) => Promise<unknown>;
        }
      | undefined;
    const authorize = providerObj?.options?.authorize ?? providerObj?.authorize;

    it("authorizes with access_token and refresh_token, decoding JWT claims and resolving roles optionally", async () => {
      expect(authorize).toBeDefined();
      if (!authorize) return;

      const mockAccessToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc4NzEzNDg1OSwidHlwZSI6ImFjY2VzcyJ9.dZXxdm5pUEwPYizqun0I1RnjgclsnsrLjDtSwzH50uE";
      const mockRefreshToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc4NzczNjA1OSwidHlwZSI6InJlZnJlc2gifQ.d9kRKOXNBPNI5wF1LhzMhekalPnhBbZVY_CC2GFyYGo";

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: "S_200_AUTH_LOGIN_OK",
          message: "Login successful",
          data: {
            access_token: mockAccessToken,
            refresh_token: mockRefreshToken,
            token_type: "bearer",
          },
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const user = await authorize(
        { username: "admin", password: "Admin123!" },
        {} as never,
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/auth/login"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "admin", password: "Admin123!" }),
        }),
      );

      expect(user).toEqual({
        id: "admin",
        name: "admin",
        username: "admin",
        email: undefined,
        roles: [],
        permissions: [],
        tenants: [],
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        accessTokenExpires: 1787134859000,
      });
    });

    it("returns null when login endpoint returns 401", async () => {
      expect(authorize).toBeDefined();
      if (!authorize) return;

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 401 }),
      );

      const user = await authorize(
        { username: "wrong", password: "wrong" },
        {} as never,
      );

      expect(user).toBeNull();
    });
  });

  describe("session callback", () => {
    it("maps token properties onto session safely", async () => {
      const sessionCallback = authConfig.callbacks?.session;
      expect(sessionCallback).toBeDefined();
      if (!sessionCallback) return;

      const mockSession = {
        user: { id: "" },
        expires: new Date().toISOString(),
      };
      const mockToken = {
        id: "admin",
        username: "admin",
        accessToken: "access-token-123",
      };

      const result = (await sessionCallback({
        session: mockSession as never,
        token: mockToken as never,
        user: {} as never,
        newSession: undefined,
        trigger: "update",
      })) as typeof mockSession & {
        user: { id: string; username?: string };
        accessToken?: string;
      };

      expect(result.user?.id).toBe("admin");
      expect(result.user?.username).toBe("admin");
      expect(result.accessToken).toBe("access-token-123");
    });
  });
});
