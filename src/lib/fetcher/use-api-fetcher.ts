"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { toast } from "@/components/toast";
import { clearSessionCookiesAndSignOut } from "@/lib/auth/sign-out";

// Module-level, not component state -- several TableRenderer/FormRenderer
// instances can each hold their own `useApiFetcher()` callback and have
// in-flight requests 401 around the same time (e.g. a page with two
// tables). Only the first should toast + kick off sign-out; the rest are
// redundant once that's underway, and `signOut()` itself already navigates
// away, so this never needs resetting back to false.
let sessionExpiredHandled = false;

/**
 * §6.3: genuinely trivial. No `Authorization` header, no base URL, no
 * tenant header -- all of that moved server-side into the BFF proxy. The
 * browser's Network tab shows `GET /api/proxy/employees` on this app's own
 * domain, never the real backend host, never a bearer token.
 *
 * A 401 from the proxy means the session is gone or the backend rejected
 * the access token past the point a refresh could recover it (§4.3's
 * `RefreshAccessTokenError`) -- either way there's nothing left to retry
 * client-side, so it's treated the same as a manual sign-out: a toast, then
 * `clearSessionCookiesAndSignOut()` redirects to `/login`.
 */
export function useApiFetcher() {
  const t = useTranslations("common");

  return useCallback(
    async (path: string, options: RequestInit = {}) => {
      const res = await fetch(`/api/proxy${path}`, options);

      if (res.status === 401 && !sessionExpiredHandled) {
        sessionExpiredHandled = true;
        toast({
          variant: "error",
          description: t("topbar.sessionExpiredToast"),
        });
        void clearSessionCookiesAndSignOut();
      }

      return res;
    },
    [t],
  );
}

export type ApiFetcher = ReturnType<typeof useApiFetcher>;
