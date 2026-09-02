"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { toast } from "@/components/toast";
import { clearSessionCookiesAndSignOut } from "@/lib/auth/sign-out";
import { SESSION_EXPIRED_LOGIN_URL } from "@/lib/auth/session-constants";
import {
  broadcastSessionActivity,
  broadcastSessionExpired,
} from "@/lib/auth/session-sync";

// Module-level, not component state -- several TableRenderer/FormRenderer
// instances can each hold their own `useApiFetcher()` callback and have
// in-flight requests 401 around the same time (e.g. a page with two
// tables). Only the first should toast + kick off sign-out; the rest are
// redundant once that's underway.
let sessionExpiredHandled = false;

export interface ApiFetcherOptions extends RequestInit {
  /** When true, marks request as background polling, so session is authenticated but lastActiveAt is not extended */
  isBackground?: boolean;
}

/**
 * §6.3: genuinely trivial. No `Authorization` header, no base URL, no
 * tenant header -- all of that moved server-side into the BFF proxy. The
 * browser's Network tab shows `GET /api/proxy/employees` on this app's own
 * domain, never the real backend host, never a bearer token.
 *
 * Enforces session synchronization on qualifying activity responses and
 * handles background polling headers (`isBackground`).
 */
export function useApiFetcher() {
  const t = useTranslations("common");

  return useCallback(
    async (path: string, options: ApiFetcherOptions = {}) => {
      const { isBackground, headers, ...restOptions } = options;
      const requestHeaders = new Headers(headers);

      if (isBackground) {
        requestHeaders.set("x-background-activity", "true");
      }

      const res = await fetch(path, {
        ...restOptions,
        headers: requestHeaders,
      });

      if (res.status === 401) {
        if (!sessionExpiredHandled) {
          sessionExpiredHandled = true;
          broadcastSessionExpired();
          toast({
            variant: "error",
            description: t("topbar.sessionExpiredToast"),
          });
          void clearSessionCookiesAndSignOut(SESSION_EXPIRED_LOGIN_URL);
        }
      } else if (res.ok) {
        sessionExpiredHandled = false;
        const lastActive = res.headers.get("X-Session-Last-Active");
        if (lastActive) {
          broadcastSessionActivity(Number(lastActive));
        }
      }

      return res;
    },
    [t],
  );
}

export type ApiFetcher = ReturnType<typeof useApiFetcher>;
