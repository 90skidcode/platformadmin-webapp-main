/**
 * BRD-compliant session timeouts and configuration.
 *
 * Requirements:
 * 1. INACTIVITY_TIMEOUT_MS: 10 minutes without qualifying server-side activity.
 * 2. WARNING_TIME_MS: 8 minutes of inactivity (2 minutes before expiry warning).
 * 3. ABSOLUTE_TIMEOUT_MS: 8 hours from original login (never extended).
 */

export const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes (600,000 ms)
export const WARNING_TIME_MS = 8 * 60 * 1000; // 8 minutes (480,000 ms)
export const WARNING_WINDOW_MS = INACTIVITY_TIMEOUT_MS - WARNING_TIME_MS; // 2 minutes (120,000 ms)
export const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours (28,800,000 ms)

export const LAST_ACTIVE_COOKIE_NAME = "admin-last-active";
export const SESSION_SYNC_CHANNEL_NAME = "platformadmin_session_sync";
export const SESSION_SYNC_STORAGE_KEY = "platformadmin_session_sync_state";

export const SESSION_SYNC_EVENTS = {
  ACTIVITY: "SESSION_ACTIVITY",
  EXTENDED: "SESSION_EXTENDED",
  EXPIRED: "SESSION_EXPIRED",
  LOGOUT: "SESSION_LOGOUT",
} as const;

export type SessionSyncEventType =
  (typeof SESSION_SYNC_EVENTS)[keyof typeof SESSION_SYNC_EVENTS];

export const SESSION_ERRORS = {
  EXPIRED: "SessionExpiredError",
} as const;

export const SESSION_EXPIRY_REASONS = {
  INACTIVITY_TIMEOUT: "INACTIVITY_TIMEOUT",
  ABSOLUTE_LIMIT_REACHED: "ABSOLUTE_LIMIT_REACHED",
  SESSION_REVOKED: "SESSION_REVOKED",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  USER_SIGN_OUT: "USER_SIGN_OUT",
} as const;

export type SessionExpiryReason =
  (typeof SESSION_EXPIRY_REASONS)[keyof typeof SESSION_EXPIRY_REASONS];

export const SESSION_EXPIRED_QUERY_PARAM = "session-expired";
export const SESSION_EXPIRED_LOGIN_URL = `/login?reason=${SESSION_EXPIRED_QUERY_PARAM}`;
