/**
 * Single source of truth for backend endpoint *paths* (never a base URL --
 * that's `resolveBaseUrl()` in `@/lib/backend-client/environment-config.server`,
 * driven entirely by the `API_URL` env var, §6.1).
 *
 * Every literal path string that gets passed to `fetch`, `callBackend`, or
 * `useApiFetcher` should come from here instead of being typed inline, so
 * there's one place to find/rename a route.
 *
 * `auth.*` entries are bare backend paths -- `auth.config.ts`,
 * `refresh-token.ts`, and `resolve-roles.ts` call the backend directly
 * (`${API_URL}${apiEndpoints.auth.login}`), never through the proxy.
 * `settings`/`users.*` carry the `PROXY_BASE_PATH` prefix baked in, since
 * `useApiFetcher` does no prefixing of its own -- it just does
 * `fetch(path, options)`, so every caller must hand it a full path already.
 *
 * Table/form JSON schemas (`src/schemas/**\/*.json`) declare their own
 * `endpoint.url` values -- they can't import a TS constant, so `/api/proxy`
 * is typed directly into those JSON files instead of via `PROXY_BASE_PATH`.
 */

/**
 * Same-origin prefix for the BFF proxy route (§6.2/§6.3). Not an env var --
 * unlike `API_URL` it doesn't vary per deployment, it's fixed by this app's
 * own route folder at `src/app/api/proxy/[...path]/route.ts`. Rename that
 * folder and update this constant together.
 */
export const PROXY_BASE_PATH = "/api/proxy";

export const apiEndpoints = {
  auth: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    me: "/me",
  },
  settings: `${PROXY_BASE_PATH}/settings`,
  users: {
    list: `${PROXY_BASE_PATH}/users`,
    byId: (userId: string) => `${PROXY_BASE_PATH}/users/${userId}`,
    resendInvite: (userId: string) =>
      `${PROXY_BASE_PATH}/users/${userId}/resend-invite`,
  },
} as const;
