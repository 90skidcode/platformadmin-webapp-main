"use client";

import { useCallback } from "react";

/**
 * §6.3: genuinely trivial. No `Authorization` header, no base URL, no
 * tenant header -- all of that moved server-side into the BFF proxy. The
 * browser's Network tab shows `GET /api/proxy/employees` on this app's own
 * domain, never the real backend host, never a bearer token.
 */
export function useApiFetcher() {
  return useCallback(
    (path: string, options: RequestInit = {}) =>
      fetch(`/api/proxy${path}`, options),
    [],
  );
}

export type ApiFetcher = ReturnType<typeof useApiFetcher>;
