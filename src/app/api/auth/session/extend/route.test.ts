import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { signActivityTimestamp } from "@/lib/auth/session-activity.server";
import {
  ABSOLUTE_TIMEOUT_MS,
  INACTIVITY_TIMEOUT_MS,
  LAST_ACTIVE_COOKIE_NAME,
  SESSION_EXPIRY_REASONS,
  WARNING_TIME_MS,
} from "@/lib/auth/session-constants";

const authMock = vi.fn();
const cookiesMock = vi.fn();

vi.mock("@/auth/auth", () => ({ auth: () => authMock() }));
vi.mock("next/headers", () => ({ cookies: () => cookiesMock() }));

function makeCookieStore(values: Record<string, string>) {
  return {
    get: (name: string) => (values[name] ? { value: values[name] } : undefined),
  };
}

describe("BRD: Server Endpoint for Session Extension (Continue Session)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects session extension request with 401 when the user has no authenticated session", async () => {
    authMock.mockResolvedValue(null);
    cookiesMock.mockResolvedValue(makeCookieStore({}));

    const res = await POST();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("unauthorized");
  });

  it("successfully extends session and resets inactivity timer when requested during the warning window (8m)", async () => {
    const now = Date.now();
    const sessionCreatedAt = now - WARNING_TIME_MS;
    const lastActiveAt = now - WARNING_TIME_MS; // warning threshold

    authMock.mockResolvedValue({
      user: { id: "u1" },
      sessionCreatedAt,
      lastActiveAt,
    });
    cookiesMock.mockResolvedValue(
      makeCookieStore({
        [LAST_ACTIVE_COOKIE_NAME]: signActivityTimestamp(lastActiveAt),
      }),
    );

    const res = await POST();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe("S_200_SESSION_EXTENDED");
    expect(body.data.lastActiveAt).toBeGreaterThanOrEqual(now);
    expect(body.data.sessionCreatedAt).toBe(sessionCreatedAt);
    expect(res.headers.get("X-Session-Last-Active")).toBeTruthy();
    expect(res.cookies.get(LAST_ACTIVE_COOKIE_NAME)).toBeTruthy();
  });

  it("denies session extension with 401 when the user has already reached 10 minutes of inactivity", async () => {
    const now = Date.now();
    const sessionCreatedAt = now - (INACTIVITY_TIMEOUT_MS + 5000);
    const lastActiveAt = now - (INACTIVITY_TIMEOUT_MS + 1000); // expired

    authMock.mockResolvedValue({
      user: { id: "u1" },
      sessionCreatedAt,
      lastActiveAt,
    });
    cookiesMock.mockResolvedValue(
      makeCookieStore({
        [LAST_ACTIVE_COOKIE_NAME]: signActivityTimestamp(lastActiveAt),
      }),
    );

    const res = await POST();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe(SESSION_EXPIRY_REASONS.INACTIVITY_TIMEOUT);
  });

  it("denies session extension with 401 when the session has reached the 8-hour absolute maximum ceiling", async () => {
    const now = Date.now();
    const sessionCreatedAt = now - (ABSOLUTE_TIMEOUT_MS + 1000); // > 8 hours ago
    const lastActiveAt = now - 1000; // recently active

    authMock.mockResolvedValue({
      user: { id: "u1" },
      sessionCreatedAt,
      lastActiveAt,
    });
    cookiesMock.mockResolvedValue(
      makeCookieStore({
        [LAST_ACTIVE_COOKIE_NAME]: signActivityTimestamp(lastActiveAt),
      }),
    );

    const res = await POST();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe(SESSION_EXPIRY_REASONS.ABSOLUTE_LIMIT_REACHED);
  });
});
