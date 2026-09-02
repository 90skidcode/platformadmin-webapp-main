"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from "@/components/ui";
import {
  ABSOLUTE_TIMEOUT_MS,
  INACTIVITY_TIMEOUT_MS,
  SESSION_ERRORS,
  SESSION_EXPIRED_LOGIN_URL,
  SESSION_EXPIRY_REASONS,
  SESSION_SYNC_EVENTS,
  WARNING_TIME_MS,
} from "@/lib/auth/session-constants";
import {
  broadcastSessionExpired,
  broadcastSessionExtended,
  subscribeToSessionSync,
} from "@/lib/auth/session-sync";
import { clearSessionCookiesAndSignOut } from "@/lib/auth/sign-out";

export interface SessionInactivityWatcherProps {
  /**
   * Authoritative last active timestamp resolved on the server from the signed
   * admin-last-active cookie during page render / full refresh.
   */
  initialLastActiveAt?: number;
}

/**
 * Formats a duration in seconds to MM:SS string (e.g. 120 -> "2:00", 65 -> "1:05").
 */
function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * BRD-compliant session inactivity watcher and warning modal with live countdown.
 *
 * Requirements:
 * 1. Shows inactivity warning modal at exactly 8 minutes of inactivity with a live 2-minute countdown (MM:SS).
 * 2. "Continue Session" calls POST /api/auth/session/extend to verify server-side eligibility.
 * 3. Enforces 10-minute inactivity expiry and 8-hour absolute maximum session limit.
 * 4. Synchronizes state and warning dismissal across all open browser tabs via BroadcastChannel.
 */
export function SessionInactivityWatcher({
  initialLastActiveAt,
}: SessionInactivityWatcherProps = {}) {
  const { data: session, status } = useSession();
  const t = useTranslations("auth.session");

  const [lastActiveAt, setLastActiveAt] = useState<number | null>(
    () => initialLastActiveAt ?? null,
  );
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(120);

  // Sync initial timestamps from session or initialLastActiveAt prop
  useEffect(() => {
    if (status === "authenticated" && session) {
      if (session.error === SESSION_ERRORS.EXPIRED) {
        void clearSessionCookiesAndSignOut(SESSION_EXPIRED_LOGIN_URL);
        return;
      }

      const sessionCreatedAt = session.sessionCreatedAt ?? Date.now();
      const serverActiveAt =
        initialLastActiveAt ?? session.lastActiveAt ?? sessionCreatedAt;
      const sessionActiveAt = Math.max(sessionCreatedAt, serverActiveAt);

      setLastActiveAt((prev) =>
        prev ? Math.max(prev, sessionActiveAt) : sessionActiveAt,
      );
    }
  }, [initialLastActiveAt, session, status]);

  // Subscribe to cross-tab synchronization events
  useEffect(() => {
    if (status !== "authenticated") return;

    const unsubscribe = subscribeToSessionSync((event) => {
      if (
        event.type === SESSION_SYNC_EVENTS.ACTIVITY ||
        event.type === SESSION_SYNC_EVENTS.EXTENDED
      ) {
        setLastActiveAt(event.lastActiveAt);
        setIsWarningOpen(false);
      } else if (
        event.type === SESSION_SYNC_EVENTS.EXPIRED ||
        event.type === SESSION_SYNC_EVENTS.LOGOUT
      ) {
        setIsWarningOpen(false);
        void clearSessionCookiesAndSignOut(SESSION_EXPIRED_LOGIN_URL);
      }
    });

    return unsubscribe;
  }, [status]);

  const handleExpire = useCallback(() => {
    setIsWarningOpen(false);
    broadcastSessionExpired(SESSION_EXPIRY_REASONS.INACTIVITY_TIMEOUT);
    void clearSessionCookiesAndSignOut(SESSION_EXPIRED_LOGIN_URL);
  }, []);

  const getRemainingSeconds = useCallback(() => {
    if (status !== "authenticated" || !session || lastActiveAt === null) {
      return 0;
    }
    const now = Date.now();
    const sessionCreatedAt = session.sessionCreatedAt ?? now;
    const absoluteExpiryTime = sessionCreatedAt + ABSOLUTE_TIMEOUT_MS;
    const inactivityExpiryTime = lastActiveAt + INACTIVITY_TIMEOUT_MS;
    const expiryTime = Math.min(inactivityExpiryTime, absoluteExpiryTime);
    return Math.max(0, Math.ceil((expiryTime - now) / 1000));
  }, [lastActiveAt, session, status]);

  const evaluateTimers = useCallback(() => {
    if (status !== "authenticated" || !session || lastActiveAt === null) return;

    const now = Date.now();
    const sessionCreatedAt = session.sessionCreatedAt ?? now;
    const absoluteExpiryTime = sessionCreatedAt + ABSOLUTE_TIMEOUT_MS;
    const inactivityExpiryTime = lastActiveAt + INACTIVITY_TIMEOUT_MS;
    const expiryTime = Math.min(inactivityExpiryTime, absoluteExpiryTime);
    const warningTime = lastActiveAt + WARNING_TIME_MS;

    if (now >= expiryTime) {
      handleExpire();
      return;
    }

    if (now >= warningTime) {
      setIsWarningOpen(true);
      setRemainingSeconds(getRemainingSeconds());
    } else {
      setIsWarningOpen(false);
    }
  }, [getRemainingSeconds, handleExpire, lastActiveAt, session, status]);

  // Set up timers whenever lastActiveAt or session changes
  useEffect(() => {
    if (status !== "authenticated" || !session || lastActiveAt === null) return;

    evaluateTimers();

    const now = Date.now();
    const sessionCreatedAt = session.sessionCreatedAt ?? now;
    const absoluteExpiryTime = sessionCreatedAt + ABSOLUTE_TIMEOUT_MS;
    const inactivityExpiryTime = lastActiveAt + INACTIVITY_TIMEOUT_MS;
    const expiryTime = Math.min(inactivityExpiryTime, absoluteExpiryTime);
    const warningTime = lastActiveAt + WARNING_TIME_MS;

    const warningDelay = Math.max(0, warningTime - now);
    const expiryDelay = Math.max(0, expiryTime - now);

    const warningTimer = setTimeout(() => {
      setIsWarningOpen(true);
      setRemainingSeconds(getRemainingSeconds());
    }, warningDelay);

    const expiryTimer = setTimeout(() => {
      handleExpire();
    }, expiryDelay);

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(expiryTimer);
    };
  }, [
    evaluateTimers,
    getRemainingSeconds,
    handleExpire,
    lastActiveAt,
    session,
    status,
  ]);

  // Live countdown ticker when warning modal is visible
  useEffect(() => {
    if (!isWarningOpen) return;

    setRemainingSeconds(getRemainingSeconds());

    const interval = setInterval(() => {
      const remaining = getRemainingSeconds();
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        handleExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [getRemainingSeconds, handleExpire, isWarningOpen]);

  // Check timers when user returns to tab / visibility changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        evaluateTimers();
      }
    };

    window.addEventListener("focus", evaluateTimers);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", evaluateTimers);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [evaluateTimers]);

  const handleContinueSession = async () => {
    setIsExtending(true);
    try {
      const res = await fetch("/api/auth/session/extend", { method: "POST" });
      if (res.ok) {
        const body = await res.json();
        const nextActiveAt = body?.data?.lastActiveAt ?? Date.now();
        setLastActiveAt(nextActiveAt);
        setIsWarningOpen(false);
        broadcastSessionExtended(nextActiveAt);
      } else {
        // Rejected server-side: session already expired or reached 8h limit
        handleExpire();
      }
    } catch {
      handleExpire();
    } finally {
      setIsExtending(false);
    }
  };

  const handleSignOut = () => {
    setIsWarningOpen(false);
    broadcastSessionExpired(SESSION_EXPIRY_REASONS.USER_SIGN_OUT);
    void clearSessionCookiesAndSignOut();
  };

  if (status !== "authenticated") return null;

  return (
    <AlertDialog open={isWarningOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("warningTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("warningMessage", {
              time: formatCountdown(remainingSeconds),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 sm:gap-3">
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={isExtending}
          >
            {t("signOut")}
          </Button>
          <Button
            variant="primary"
            onClick={handleContinueSession}
            disabled={isExtending}
          >
            {isExtending ? "..." : t("continueSession")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
