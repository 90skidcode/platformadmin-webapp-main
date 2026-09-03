import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  signActivityTimestamp,
  verifyActivityTimestamp,
  validateSessionState,
  resolveLastActiveTimestamp,
  getInitialLastActiveAt,
} from "./session-activity.server";
import {
  ABSOLUTE_TIMEOUT_MS,
  INACTIVITY_TIMEOUT_MS,
  LAST_ACTIVE_COOKIE_NAME,
  SESSION_EXPIRY_REASONS,
  WARNING_TIME_MS,
} from "./session-constants";

const cookiesMock = vi.fn();
vi.mock("next/headers", () => ({ cookies: () => cookiesMock() }));

function makeCookieStore(values: Record<string, string>) {
  return {
    get: (name: string) => (values[name] ? { value: values[name] } : undefined),
  };
}

describe("BRD: Server-Side Session Policy & Cryptographic Validation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("Cryptographic Activity Token Verification", () => {
    it("successfully verifies authentic, untampered activity timestamp tokens", () => {
      const now = Date.now();
      const signed = signActivityTimestamp(now);
      const verified = verifyActivityTimestamp(signed);

      expect(verified).toBe(now);
    });

    it("rejects forged or modified timestamp tokens to prevent session hijacking", () => {
      const now = Date.now();
      const signed = signActivityTimestamp(now);
      const tampered = signed.replace("1", "2");

      expect(verifyActivityTimestamp(tampered)).toBeNull();
    });

    it("safely handles corrupted, non-string, or missing tokens by returning null", () => {
      expect(verifyActivityTimestamp(undefined)).toBeNull();
      expect(verifyActivityTimestamp(null)).toBeNull();
      expect(verifyActivityTimestamp("invalid-format")).toBeNull();
      expect(verifyActivityTimestamp("abc.xyz")).toBeNull();
    });
  });

  describe("Inactivity & Absolute Ceiling Policy Enforcement", () => {
    it("keeps session valid during active user interactions within the 8-minute window", () => {
      const loginTime = Date.now();
      const lastActive = loginTime + Math.floor(WARNING_TIME_MS / 2);
      const currentTime = lastActive + Math.floor(WARNING_TIME_MS / 4);

      const result = validateSessionState(loginTime, lastActive, currentTime);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("keeps session valid at the 8-minute warning threshold before expiration occurs", () => {
      const loginTime = Date.now();
      const lastActive = loginTime;
      const warningTime = lastActive + WARNING_TIME_MS; // 8m of inactivity

      const result = validateSessionState(loginTime, lastActive, warningTime);
      expect(result.valid).toBe(true);
    });

    it("expires the session with INACTIVITY_TIMEOUT when 10 minutes of continuous inactivity is reached", () => {
      const loginTime = Date.now();
      const lastActive = loginTime;
      const expiryTime = lastActive + INACTIVITY_TIMEOUT_MS; // 10m of inactivity

      const result = validateSessionState(loginTime, lastActive, expiryTime);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe(SESSION_EXPIRY_REASONS.INACTIVITY_TIMEOUT);
    });

    it("expires the session with INACTIVITY_TIMEOUT when inactivity duration exceeds 10 minutes", () => {
      const loginTime = Date.now();
      const lastActive = loginTime;
      const pastExpiry = lastActive + INACTIVITY_TIMEOUT_MS + 5000;

      const result = validateSessionState(loginTime, lastActive, pastExpiry);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe(SESSION_EXPIRY_REASONS.INACTIVITY_TIMEOUT);
    });

    it("terminates session with ABSOLUTE_LIMIT_REACHED at 8 hours from login even if user was recently active", () => {
      const loginTime = Date.now();
      const lastActive = loginTime + ABSOLUTE_TIMEOUT_MS - 1000; // active 1 second ago
      const currentTime = loginTime + ABSOLUTE_TIMEOUT_MS; // 8 hours total duration

      const result = validateSessionState(loginTime, lastActive, currentTime);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe(SESSION_EXPIRY_REASONS.ABSOLUTE_LIMIT_REACHED);
    });

    it("strictly prioritizes the 8-hour absolute maximum limit over any subsequent user activity", () => {
      const loginTime = Date.now();
      const lastActive = loginTime + ABSOLUTE_TIMEOUT_MS + 1000;
      const currentTime = loginTime + ABSOLUTE_TIMEOUT_MS + 2000;

      const result = validateSessionState(loginTime, lastActive, currentTime);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe(SESSION_EXPIRY_REASONS.ABSOLUTE_LIMIT_REACHED);
    });
  });

  describe("Session Activity Timestamp Resolution", () => {
    it("uses the verified timestamp from the activity cookie when present and valid", () => {
      const cookieTimestamp = Date.now() - 5000;
      const signed = signActivityTimestamp(cookieTimestamp);
      const fallback = Date.now() - 60000;

      expect(resolveLastActiveTimestamp(signed, fallback)).toBe(
        cookieTimestamp,
      );
    });

    it("falls back safely to the session creation timestamp if the cookie is absent or tampered", () => {
      const fallback = Date.now() - 60000;

      expect(resolveLastActiveTimestamp(undefined, fallback)).toBe(fallback);
      expect(resolveLastActiveTimestamp("tampered.signature", fallback)).toBe(
        fallback,
      );
    });
  });

  describe("getInitialLastActiveAt (Server Component Initial Activity Helper)", () => {
    it("resolves the verified cookie timestamp when valid and newer than sessionCreatedAt", async () => {
      const sessionCreatedAt = Date.now() - 100000;
      const cookieTimestamp = Date.now() - 5000;
      cookiesMock.mockResolvedValue(
        makeCookieStore({
          [LAST_ACTIVE_COOKIE_NAME]: signActivityTimestamp(cookieTimestamp),
        }),
      );

      const result = await getInitialLastActiveAt({
        sessionCreatedAt,
        lastActiveAt: sessionCreatedAt,
      });

      expect(result).toBe(cookieTimestamp);
    });

    it("bounds stale cookie timestamps to sessionCreatedAt to prevent false expiration on fresh logins", async () => {
      const sessionCreatedAt = Date.now() - 5000;
      const staleOldCookieTimestamp = Date.now() - 500000; // old cookie from prior session
      cookiesMock.mockResolvedValue(
        makeCookieStore({
          [LAST_ACTIVE_COOKIE_NAME]: signActivityTimestamp(
            staleOldCookieTimestamp,
          ),
        }),
      );

      const result = await getInitialLastActiveAt({
        sessionCreatedAt,
        lastActiveAt: sessionCreatedAt,
      });

      expect(result).toBe(sessionCreatedAt);
    });

    it("falls back safely to session.lastActiveAt when cookie is absent", async () => {
      const sessionCreatedAt = Date.now() - 50000;
      const sessionLastActiveAt = Date.now() - 20000;
      cookiesMock.mockResolvedValue(makeCookieStore({}));

      const result = await getInitialLastActiveAt({
        sessionCreatedAt,
        lastActiveAt: sessionLastActiveAt,
      });

      expect(result).toBe(sessionLastActiveAt);
    });

    it("safely handles null or empty session object without throwing", async () => {
      cookiesMock.mockResolvedValue(makeCookieStore({}));

      const resultNull = await getInitialLastActiveAt(null);
      expect(resultNull).toBe(0);

      const resultUndefined = await getInitialLastActiveAt(undefined);
      expect(resultUndefined).toBe(0);
    });
  });
});
