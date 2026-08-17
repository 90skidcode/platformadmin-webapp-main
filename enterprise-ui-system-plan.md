# Enterprise JSON-Driven UI System — Architecture Plan (v5)

> **Version check first, since it changes real code:** there's no Next.js 19 — the current stable line is **Next.js 16** (16.3.x as of this writing; React 19.2 ships inside it, which is likely what "19" was pointing at). Next.js 16 audit (v4) targeted **middleware**, because Next.js 16 actually did rename it: `middleware.ts` is deprecated in favor of `proxy.ts`, and route-protection (§4.4) is built around that.

**New in this pass (v5):** a same-origin API proxy so browser DevTools never shows the real backend URL or bearer token (§6), a nonce-based CSP with `unsafe-eval`/`unsafe-inline` closed for scripts and one honestly-flagged exception for Radix's inline positioning styles (§16), full enforcement (not just documentation) of the "100% tokenized" styling rule via lint (§16.3), a Husky + lint-staged + commitlint + secret-scan setup (§17), and SonarQube coverage with a real quality gate (§18).

**Stack (corrected):** Next.js 16 (App Router, Turbopack dev by default), TypeScript, Tailwind CSS, Radix UI primitives, `class-variance-authority` + `tailwind-merge`, `react-hook-form` + `zod`, `@tanstack/react-table`, `next-intl`, `lucide-react`, `next-auth@beta` (Auth.js v5), `msw` + `vitest` + `@testing-library/react`, `husky` + `lint-staged` + `commitlint` + `gitleaks`, `stylelint` + `eslint-plugin-tailwindcss`, SonarQube/SonarCloud.

---

## 1. Goals (updated)

1. Everything from v2: token-driven primitives, JSON-driven form/table engines, toast, i18n, per-component folders with co-located Vitest specs.
2. **Authentication:** NextAuth (Auth.js v5), Credentials provider, JWT session strategy, access-token rotation, defense-in-depth route protection.
3. **Role-based Sidebar + Topbar:** nav items gate on role/permission; topbar carries environment switcher, tenant switcher, and the user menu.
4. **Environment + tenant switching:** one control surface that repoints every form/table's API calls at a different backend _and_ scopes them to a different tenant, without touching any JSON schema.
5. **Unified action model:** every action (form or table, submit or bare button) can declare `onClick` to run a real function from a consumer-supplied registry — the exact thing you flagged on the actions JSON.
6. **Platform-admin baseline:** a short list of recommended screens (User Management, Audit Log, Settings) that double as proof the engine works, built almost entirely from JSON.

---

## 2. Folder Structure (updated)

```
src/
  app/
    login/
      page.tsx                       # renders <FormRenderer schema={loginFormSchema} .../>, see §4.5
    (admin)/
      layout.tsx                     # calls auth() server-side, redirects if unauthenticated; wraps <AppShell>
      users/page.tsx                 # Platform Admin screens, §12 — later phase
      audit-log/page.tsx
      settings/page.tsx
    api/
      proxy/
        [...path]/route.ts           # BFF: same-origin proxy to the real backend, §6.2
  proxy.ts                           # Next.js 16's replacement for middleware.ts -- CSP nonce + optimistic redirect, §4.4 / §16.1
  auth/
    auth.config.ts                   # NextAuthConfig: Credentials provider, JWT callbacks
    auth.ts                          # NextAuth() -> { handlers, auth, signIn, signOut }
    resolve-roles.ts   resolve-roles.test.ts     # pluggable roles/permissions/tenants resolution, §4.2
    refresh-token.ts   refresh-token.test.ts     # access-token rotation, §4.3
  components/
    ui/                              # unchanged from v2 -- 14 primitives, one folder each
    app-shell/
      sidebar/            sidebar.tsx  sidebar.test.tsx  index.ts            # now role/permission-aware, §5
      bottom-nav/         bottom-nav.tsx  bottom-nav.test.tsx  index.ts
      topbar/             topbar.tsx  topbar.test.tsx  index.ts             # env + tenant switcher + user menu
      environment-switcher/  environment-switcher.tsx  .test.tsx  index.ts   # NEW, §6
      tenant-switcher/       tenant-switcher.tsx  .test.tsx  index.ts        # NEW, §6
      app-shell/          app-shell.tsx  app-shell.test.tsx  index.ts
    form/                             # unchanged structure from v2
      form-renderer/  form-actions/  schema-to-zod/  field-registry.tsx  fields/  types.ts
    table/                            # unchanged structure from v2
    toast/                            # unchanged structure from v2
  lib/
    action-handlers/    action-handlers.ts  .test.ts  index.ts
    event-handlers/     event-handler-registry.ts  .test.ts  index.ts
    environment/         environment-provider.tsx  .test.tsx  index.ts       # client-safe id/label only, §6.1
    tenant/              tenant-provider.tsx  .test.tsx  index.ts
    backend-client/
      environment-config.server.ts   # server-only URL map, §6.1 -- import "server-only" enforced
      backend-client.server.ts  backend-client.test.ts   # shared fetch+header logic, §6.2
    fetcher/             use-api-fetcher.ts  .test.ts  index.ts             # now trivial, same-origin only, §6.3
    permissions/         permissions.ts  .test.ts  index.ts                  # reads NextAuth session, §5
    i18n/                 request.ts  format.ts
  styles/
    tokens.css
  messages/
    en/{common,forms,tables,auth}.json
    ar/{common,forms,tables,auth}.json
  test/
    setup.ts
    mocks/handlers.ts
  e2e/
    responsive.spec.ts
    auth.spec.ts                     # Playwright: unauthenticated redirect, login flow, role-gated nav -- §15
.husky/
  pre-commit  commit-msg  pre-push    # §17
commitlint.config.ts                  # §17
stylelint.config.js                   # §16.3 -- stylelint-declaration-strict-value
sonar-project.properties              # §18
```

---

## 3. Design Tokens

Unchanged from v2 — full color/spacing/typography/radius/shadow/z-index/motion token set, all consumed via CSS variables, nothing hardcoded. (See the delivered `src/styles/tokens.css` in the Phase 0 kit for the color half.)

---

## 4. Authentication — NextAuth (Auth.js v5) with JWT

### 4.1 Provider & session strategy

Credentials provider, calling your own login API; JWT session strategy (no database session table — the session lives entirely in a signed cookie, which is what "NextAuth with JWT token" means in practice).

```ts
// auth/auth.config.ts
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import { resolveAccess } from "./resolve-roles";
import { refreshAccessToken } from "./refresh-token";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const res = await fetch(`${process.env.AUTH_API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });
        if (!res.ok) return null; // wrong password / unknown user -> NextAuth surfaces a generic auth error
        const data = await res.json(); // { user, accessToken, refreshToken, accessTokenExpires, roles?, permissions?, tenants? }
        const access = await resolveAccess(data, data.accessToken);
        return {
          ...data.user,
          ...access,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          accessTokenExpires: data.accessTokenExpires,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) return { ...token, ...user }; // first sign-in: seed from authorize()
      if (Date.now() < (token.accessTokenExpires as number)) return token;
      return refreshAccessToken(token); // rotate before the backend token expires
    },
    async session({ session, token }) {
      session.user.roles = token.roles as string[];
      session.user.permissions = token.permissions as string[];
      session.user.tenants = token.tenants as { id: string; name: string }[];
      session.accessToken = token.accessToken as string;
      session.error = token.error as string | undefined; // set if refresh failed -- client forces sign-out on this
      return session;
    },
  },
};
```

### 4.2 Roles/permissions/tenants — pluggable, since the source isn't decided yet

Everything downstream (Sidebar, action `permission` gates, route checks) reads a normalized shape: `session.user.roles: string[]`, `session.user.permissions: string[]`, `session.user.tenants: { id, name }[]`. **One function** decides how that shape gets filled in, so whichever way your backend team lands, nothing else in the app changes:

```ts
// auth/resolve-roles.ts
export interface ResolvedAccess {
  roles: string[];
  permissions: string[];
  tenants: { id: string; name: string }[];
}

export async function resolveAccess(
  loginResponse: LoginResponse,
  accessToken: string,
): Promise<ResolvedAccess> {
  // 1) Roles/permissions embedded directly in the login response
  if (loginResponse.roles || loginResponse.permissions) {
    return {
      roles: loginResponse.roles ?? [],
      permissions: loginResponse.permissions ?? [],
      tenants: loginResponse.tenants ?? [],
    };
  }
  // 2) Fall back to a separate endpoint
  try {
    const me = await fetcher("/me", { accessToken });
    return {
      roles: me.roles ?? [],
      permissions: me.permissions ?? [],
      tenants: me.tenants ?? [],
    };
  } catch {
    console.warn(
      "[auth] Could not resolve roles/permissions -- defaulting to no access. Check the /me endpoint or the login response shape.",
    );
    return { roles: [], permissions: [], tenants: [] };
  }
}
```

When you know the answer, this is the only file that changes. `resolve-roles.test.ts` covers all three branches (embedded, fetched, failed) now, ahead of that decision.

### 4.3 Access-token storage & rotation

The backend's own access token (not the NextAuth session cookie) rides inside the JWT session token as `token.accessToken`, and is what `fetcher.ts` attaches as `Authorization: Bearer ...` on every form/table API call (§6). `refresh-token.ts` rotates it before expiry using `token.refreshToken`:

```ts
// auth/refresh-token.ts
export async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(`${process.env.AUTH_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });
    if (!res.ok) throw new Error("refresh failed");
    const refreshed = await res.json();
    return {
      ...token,
      accessToken: refreshed.accessToken,
      accessTokenExpires: refreshed.accessTokenExpires,
      refreshToken: refreshed.refreshToken ?? token.refreshToken,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" }; // session.error surfaces this; client forces sign-out
  }
}
```

_(This assumes your login API returns a `refreshToken` and an `/auth/refresh` endpoint exists — flagged in §19 if that's not the case yet.)_

### 4.4 Route protection — `proxy.ts` (not `middleware.ts`), plus a real check behind it

**This is the concrete thing that changes for Next.js 16.** `middleware.ts` is deprecated — as of the current stable release, Next.js no longer looks for that filename at all, so a leftover `middleware.ts` doesn't error, it just silently stops running, which for an auth gate is the worst possible failure mode. The replacement is `proxy.ts` at the same project root, exporting a function named `proxy` instead of `middleware`:

```ts
// proxy.ts
import { auth } from "@/auth/auth";

export function proxy(request: NextRequest) {
  // Optimistic check only: does a session cookie exist? No crypto/DB work here.
  const hasSessionCookie = request.cookies.has("authjs.session-token");
  if (!hasSessionCookie && !request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
export const config = {
  matcher: ["/((?!login|api/auth|_next|favicon.ico).*)"],
};
```

Next.js's own framing for this file post-rename is **"Thin Proxy"**: it's a network boundary for lightweight, optimistic work — redirects, header/cookie checks, rewrites — not the place for real auth validation. That's not a style preference, it's the reason the file got renamed away from "middleware" in the first place (the old name invited people to put real business logic at the edge, which hurt both performance and, per Next.js's security advisories through 2026, security — several proxy/middleware-layer bypass issues have been patched at that layer specifically). So the cookie-presence check above is _only_ a fast redirect for the common case. The actual authoritative check — did the JWT actually verify, is the session actually valid — happens where it always should have: server-side, in a proper Data Access Layer, checked again at the layout:

```tsx
// app/(admin)/layout.tsx
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  return (
    <EnvironmentProvider>
      <TenantProvider>
        <AppShell
          nav={filterNavByAccess(NAV_ITEMS, session)}
          title={session.user.name}
        >
          {children}
        </AppShell>
      </TenantProvider>
    </EnvironmentProvider>
  );
}
```

Every admin route sits under `app/(admin)/`, so this one layout check covers all of them.

**One thing to verify empirically in Phase 0c, not assume:** `proxy.ts` reportedly shifts the default runtime from Edge back toward Node.js, which — if accurate for the exact Next.js 16.3.x patch version we build against — is good news for Auth.js v5, since a lot of the historical "middleware + NextAuth" pain came from Edge runtime's restricted APIs. Early Next.js 16 migration write-ups specifically call out the Auth.js v5 proxy wrapper as one of the trickier spots in this migration. Budget a spike to confirm the exact `auth()` wrapper config against whatever patch version we're actually on before building Phase 0d (§14) on top of it — don't take this paragraph as a confirmed API.

### 4.5 Login screen — the form engine, dogfooded

The login form is just another `FormRenderer` instance, and it's the natural first place to exercise the new `type: "button"` + `onClick` action (§9):

```jsonc
// schemas/login-form.json
{
  "id": "login-form",
  "i18nNamespace": "auth.login",
  "layout": { "columns": 1 },
  "fields": [
    {
      "name": "email",
      "type": "email",
      "labelKey": "fields.email.label",
      "validation": { "required": true },
    },
    {
      "name": "password",
      "type": "password",
      "labelKey": "fields.password.label",
      "validation": { "required": true, "minLength": 8 },
    },
  ],
  "actions": [
    {
      "id": "submit",
      "type": "button",
      "labelKey": "actions.signIn",
      "variant": "primary",
      "onClick": "signInWithCredentials",
    },
  ],
}
```

```tsx
<FormRenderer
  schema={loginFormSchema}
  actionHandlers={{
    signInWithCredentials: async (values) => {
      const result = await signIn("credentials", {
        ...values,
        redirect: false,
      });
      if (result?.error)
        toast({ variant: "error", title: t("errors.invalidCredentials") });
      else router.push("/");
    },
  }}
/>
```

### 4.6 Other Next.js 16 features worth using here (and ones that don't apply)

Audited the rest of the stack against current Next.js 16, not just middleware:

| Feature                                        | Use it here?               | Where                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Turbopack (stable, default `next dev`)**     | Yes, automatically         | No config needed — every `npm run dev` in this project already benefits, nothing to design around.                                                                                                                                                                                                                                                                                                                              |
| **`"use cache"` directive (Cache Components)** | Yes, narrowly              | The environment list (§6) and any nav config that's the same for everyone are good candidates for a cached server function — they're the rare _not-per-user_ data in this whole app. The JSON-driven form/table engine itself stays fully client-rendered (`"use client"`) since it's interactive, per-user, and behind auth — Cache Components mainly pay off for shared/public data, which this admin app has very little of. |
| **Partial Prerendering (PPR, stable)**         | Marginal                   | Most of this app is behind `/(admin)/`, so there's little to prerender — PPR's win is biggest on pages with a static shell and a dynamic hole, which describes `/login` (static form chrome, dynamic error state) more than the authenticated screens. Worth turning on for `/login` specifically, not a priority elsewhere.                                                                                                    |
| **View Transitions (React 19.2)**              | Optional polish            | Sidebar → page navigation and Dialog open/close could use the View Transition API instead of (or alongside) the `tailwindcss-animate` CSS transitions already planned in §3. Not required — flagging as a Phase 9 polish item, not core.                                                                                                                                                                                        |
| **`useEffectEvent` (React 19.2)**              | Yes, one spot              | `useApiFetcher` (§6) closes over `env`/`tenant`/`session` — `useEffectEvent` is the cleaner tool than a `useCallback` dependency array for that specific "read latest value without re-subscribing" pattern. Small implementation detail, updating the §6 sketch to use it when we build Phase 1.                                                                                                                               |
| **`Activity` component (React 19.2)**          | Optional, genuinely useful | Wrapping table routes in `<Activity>` when navigating away and back (e.g., edit a row, then return to the list) can keep the previous filter/sort/pagination state mounted-but-hidden instead of remounting from scratch. Worth prototyping in Phase 3, not committing to yet.                                                                                                                                                  |
| **Async `params`/`searchParams`**              | Yes, mandatory             | Any dynamic admin route (`app/(admin)/employees/[id]/edit/page.tsx`) needs `params: Promise<{ id: string }>` and an `await`. Not new to 16, but confirming it's still the contract.                                                                                                                                                                                                                                             |
| **Removed: AMP, `next lint`**                  | N/A                        | Wasn't using either; just noting we're not accidentally depending on something gone.                                                                                                                                                                                                                                                                                                                                            |

---

## 5. Role-Based Sidebar + Topbar

Nav items are data, filtered against the session before render:

```ts
interface NavItem {
  id: string;
  labelKey: string;
  href: string;
  icon: string; // resolved via a lucide-react icon registry
  roles?: string[]; // visible if the user has ANY of these (OR)
  permission?: string; // visible if can(permission) is true (AND, if roles is also set)
  badge?: { count?: number; variant?: "default" | "destructive" };
  children?: NavItem[]; // desktop sidebar only; bottom nav flattens/ignores
}
```

```ts
// lib/permissions/permissions.ts
export function hasAccess(item: NavItem, session: Session | null): boolean {
  if (!session) return false;
  if (item.roles && !item.roles.some((r) => session.user.roles.includes(r)))
    return false;
  if (item.permission && !session.user.permissions.includes(item.permission))
    return false;
  return true;
}
export function can(permission: string, session: Session | null) {
  return !!session?.user.permissions.includes(permission);
}
```

`Sidebar` and `BottomNav` both call `filterNavByAccess(items, session)` before rendering — same filtering logic, so a nav item hidden on desktop is guaranteed hidden on mobile too. This is the same `permission` gate already used for form/table `actions[].permission` in v2 — one access-control concept, three places it's checked (nav, form actions, table row/bulk actions).

**Topbar** carries: page title, `EnvironmentSwitcher`, `TenantSwitcher` (§6), and a user menu (avatar, name, current role badge, "Sign out" → NextAuth `signOut()`, which also clears the environment/tenant cookies).

---

## 6. Environment + Tenant Switching — and why the browser never talks to the backend directly

You flagged that API calls shouldn't be visible in the Network tab — that's a real, common VAPT finding (exposed backend hostnames, bearer tokens sitting in plain XHR requests anyone with DevTools can read). The fix is a **Backend-for-Frontend (BFF) proxy**: the browser only ever calls same-origin `/api/proxy/...` routes on your own Next.js domain; a Route Handler on the server does the actual call to the real backend, attaching the real token server-side, where it can't be inspected. This also changes environment/tenant switching for the better — the backend URL becomes something the _server_ resolves, not something the client ever holds.

### 6.1 Environment + Tenant — client only ever sees IDs and labels

```ts
// lib/environment/environment-provider.tsx -- CLIENT-SAFE: no URLs, just what the switcher needs to render
interface Environment { id: string; labelKey: string; }
const ENVIRONMENTS: Environment[] = [
  { id: "dev", labelKey: "environments.dev" },
  { id: "staging", labelKey: "environments.staging" },
  { id: "production", labelKey: "environments.production" },
];

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState(() => getCookie("admin-environment") ?? ENVIRONMENTS[0].id);
  const active = ENVIRONMENTS.find((e) => e.id === activeId) ?? ENVIRONMENTS[0];
  const setActive = (id: string) => { setActiveId(id); setCookie("admin-environment", id); };
  return <EnvironmentContext.Provider value={{ active, environments: ENVIRONMENTS, setActive }}>{children}</EnvironmentContext.Provider>;
}
export const useEnvironment = () => useContext(EnvironmentContext)!;
```

`TenantProvider` is unchanged from before (tenant list from the session, cookie-persisted active tenant) — only `Environment` lost its `apiBaseUrl`. The actual URL-per-environment mapping now lives in exactly one place, server-only:

```ts
// lib/backend-client/environment-config.server.ts
import "server-only"; // build fails if any client component ever imports this file

export const ENVIRONMENT_BASE_URLS: Record<string, string> = {
  dev: process.env.API_URL_DEV!, // no NEXT_PUBLIC_ prefix -- never bundled into client JS
  staging: process.env.API_URL_STAGING!,
  production: process.env.API_URL_PROD!,
};
```

The `server-only` package (a one-line import with no exports — it just throws at build time if bundled into client code) is what actually enforces this isn't a client-visible constant by accident, rather than relying on everyone remembering not to add `NEXT_PUBLIC_`.

### 6.2 The proxy route — the only place the real backend URL and token meet

```ts
// app/api/proxy/[...path]/route.ts
import { auth } from "@/auth/auth";
import { cookies } from "next/headers";
import { ENVIRONMENT_BASE_URLS } from "@/lib/backend-client/environment-config.server";

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { path } = await params; // Next.js 16: params is a Promise, §4.6
  const cookieStore = await cookies();
  const envId = cookieStore.get("admin-environment")?.value ?? "production";
  const tenantId = cookieStore.get("admin-tenant")?.value ?? "";
  const baseUrl =
    ENVIRONMENT_BASE_URLS[envId] ?? ENVIRONMENT_BASE_URLS.production;

  const upstream = await fetch(
    `${baseUrl}/${path.join("/")}${request.nextUrl.search}`,
    {
      method: request.method,
      headers: {
        "Content-Type":
          request.headers.get("content-type") ?? "application/json",
        Authorization: `Bearer ${session.accessToken}`,
        "X-Tenant-Id": tenantId,
      },
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : await request.text(),
    },
  );

  // Never relay the backend's own headers verbatim -- strip anything that leaks infra details.
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
```

This single catch-all covers every `endpoint.url` in every form/table schema — nothing in the JSON contracts changes (`url` is still a path like `/employees`). Real Server Components / Server Actions that fetch data (not the interactive client-side engine) don't need this hop at all — they're already running on your server, so they can call `ENVIRONMENT_BASE_URLS[...]` + the backend directly. To avoid duplicating the fetch/header logic in two places, both routes call one shared function:

```ts
// lib/backend-client/backend-client.server.ts
import "server-only";
export async function callBackend(
  path: string,
  options: RequestInit,
  ctx: { accessToken: string; envId: string; tenantId: string },
) {
  const baseUrl =
    ENVIRONMENT_BASE_URLS[ctx.envId] ?? ENVIRONMENT_BASE_URLS.production;
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${ctx.accessToken}`,
      "X-Tenant-Id": ctx.tenantId,
    },
  });
}
```

The proxy route and any Server Component both call `callBackend()` — one implementation, two callers.

### 6.3 Client fetcher — now genuinely trivial

```ts
// lib/fetcher/use-api-fetcher.ts
export function useApiFetcher() {
  return useCallback(
    (path: string, options: RequestInit = {}) =>
      fetch(`/api/proxy${path}`, options), // same-origin; cookies ride along automatically
    [],
  );
}
```

No `Authorization` header, no base URL, no tenant header — all of that moved server-side. The browser's Network tab now shows `GET /api/proxy/employees` on your own domain, never the real backend host, and never a bearer token in a request header anyone can copy out of DevTools.

`FormRenderer` and `TableRenderer` still accept an optional `apiFetcher` prop (defaulting to `useApiFetcher()`) so tests can inject a mock without touching context providers — see §15.

### 6.4 What this buys you, concretely

- **Network tab:** only same-origin `/api/proxy/*` requests, ever.
- **CSP `connect-src`:** can be `'self'` and nothing else — the browser genuinely never needs to open a connection to any other host, which is a strong, easy-to-verify VAPT finding to close (§16).
- **Token exposure:** the backend access token never exists in browser memory or DevTools at all — it's read from the encrypted, httpOnly NextAuth session cookie, server-side, per request.
- **Error message hygiene:** the proxy can (and should) return sanitized error bodies instead of relaying a raw backend stack trace to the browser — flagged as a TODO in the handler above (`body` is currently relayed as-is for GET/read simplicity; production version should map non-2xx backend errors to a generic shape before returning them).

### 6.5 Trade-offs worth knowing about, not hiding

- **Extra hop:** every client-initiated call is now browser → Next.js server → backend → Next.js server → browser instead of browser → backend directly. For an internal admin tool this is normally negligible latency, but it's a real added hop, not free.
- **File uploads/downloads:** the `file` field type (§8) and any table export feature need the proxy route to stream the body through rather than buffer it with `request.text()` as sketched above — flagged for Phase 2 when the `file` field is actually built.
- **The proxy route becomes a single chokepoint:** rate limiting, timeout, and abuse protection now belong on `/api/proxy/*` specifically, since it's the one door everything goes through — a reasonable place to add request-size limits and per-user rate limiting later.

Switching environment or tenant still doesn't require re-authentication in this design (same session, the proxy just reads a different cookie value on the next request) — flagged in §19 as an assumption to confirm against your backend's actual tenant model.

---

## 7. JSON Contracts (updated)

### 7.1 Form Schema — actions now use a unified `onClick`

```jsonc
{
  "id": "employee-onboarding-form",
  "i18nNamespace": "forms.employeeOnboarding",
  "layout": { "columns": 2 },
  "fields": [
    /* unchanged -- see v2 / §8 */
  ],
  "actions": [
    {
      "id": "submit",
      "type": "submit",
      "labelKey": "actions.submit",
      "variant": "primary",
      "endpoint": { "method": "POST", "url": "/employees" },
      "onSuccess": {
        "toast": {
          "variant": "success",
          "messageKey": "toast.employeeCreated",
        },
        "redirect": "/employees",
      },
      "onError": {
        "toast": { "variant": "error", "messageKey": "toast.genericError" },
      },
    },
    {
      "id": "cancel",
      "type": "reset",
      "labelKey": "actions.cancel",
      "variant": "ghost",
    },
    {
      "id": "preview",
      "type": "button",
      "labelKey": "actions.preview",
      "variant": "outline",
      "onClick": "previewEmployee",
    },
  ],
}
```

The `submit`/`cancel` pair is exactly what you confirmed earlier — untouched. `preview` is the new shape: a bare button with no default REST/reset behavior, whose entire job is to call a real function.

```tsx
<FormRenderer
  schema={schema}
  actionHandlers={{
    previewEmployee: (values, formApi) => openPreviewModal(values), // any custom logic
  }}
/>
```

**Action semantics, spelled out:**

| `type`   | Default behavior                              | With `onClick` set                                                                             |
| -------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `submit` | Validates (RHF), then POSTs to `endpoint`     | Validates, then calls `onClick(values, formApi)` instead of the default POST                   |
| `reset`  | Calls `form.reset()`                          | Resets, then also calls `onClick(values, formApi)` after -- for custom reset side-effects      |
| `link`   | Renders as `<Link href>`, no form interaction | `onClick` fires before navigating (e.g. analytics)                                             |
| `button` | No default behavior -- `onClick` is required  | Runs immediately on click, **not** gated by form validation (right for "Preview"/"Save draft") |

`onSuccess`/`onError` (`toast`, `redirect`, `refetch`) apply the same way regardless of which row you're in — only how the action executes changes.

### 7.2 Table Schema — row/bulk actions use the same `onClick` field

```jsonc
"rowActions": [
  { "id": "edit", "labelKey": "actions.edit", "icon": "pencil", "handler": "navigate", "target": "/employees/{id}/edit" },
  { "id": "delete", "labelKey": "actions.delete", "icon": "trash", "handler": "api",
    "endpoint": { "method": "DELETE", "url": "/employees/{id}" },
    "confirm": { "titleKey": "confirm.delete.title", "messageKey": "confirm.delete.message" },
    "permission": "employees.delete",
    "onSuccess": { "toast": { "variant": "success", "messageKey": "toast.deleted" }, "refetch": true } },
  { "id": "resend-invite", "labelKey": "actions.resendInvite", "icon": "mail", "handler": "custom",
    "onClick": "resendInvite", "permission": "employees.invite" }
]
```

```tsx
<TableRenderer
  schema={schema}
  actionHandlers={{ resendInvite: (row) => sendInviteEmail(row.id) }}
/>
```

Same `actionHandlers` prop type as `FormRenderer` — one registry shape shared by both engines (§9).

`endpoint.url` here is also a path, resolved against the active environment the same way (§6). Everything else in the table schema is unchanged from v2.

---

## 8. All Form Field Types, Event Handlers, i18n Errors, Select Sources

Unchanged from v2 — the full 28-type registry, the event-handler contract (every field forwards `onChange`/`onBlur`/`onFocus`/etc., plus schema-declared `events` resolved against `eventHandlers`), per-field `validation.messages` i18n overrides, and Select's `static`/`remote` `optionsSource`. Nothing here changes with this update; ask and I'll reprint the full tables/examples if you want them alongside this version.

---

## 9. Form & Table Rendering Engines

**One shared registry type** for both engines:

```ts
// lib/action-handlers/action-handlers.ts
export type ActionHandlers = Record<
  string,
  (
    values: unknown,
    ctx: { formApi?: UseFormReturn; row?: unknown },
  ) => void | Promise<void>
>;
```

`FormActions` and `TableRenderer`'s row/bulk action execution both resolve `action.onClick` against this same shape, apply `confirm` (via `AlertDialog`) and `permission` (via `can()`) identically, and both call the shared `triggerToastFromConfig` helper on `onSuccess`/`onError` (unchanged from v2). This is what makes the "custom function" mechanism consistent whether you're wiring a form button or a table row action — same mental model, same prop shape, in both places.

---

## 10. i18n Strategy

Unchanged from v2, plus: `messages/{locale}/auth.json` for login/error strings, and `environments.*` / topbar-related keys live in `common.json`.

---

## 11. Toast System

Unchanged from v2. One addition: `signOut()` can optionally fire a toast ("You've been signed out") before redirecting — wire it through the same `triggerToastFromConfig` helper, not a one-off call.

---

## 12. Platform Admin — Recommended Screens

You asked to flag anything else this kind of platform typically needs. These aren't new primitives — each is just a JSON schema against the engines already planned, which doubles as a good end-to-end proof they work:

| Screen                                      | What it is                                                                                                                                                              | Notes                                                                                                                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User Management** (`/users`)              | Table: name, email, roles, tenant, last login, status. Row actions: edit roles, deactivate, resend invite. "New user" opens a Form (invite).                            | High value, almost entirely config.                                                                                                                                                |
| **Audit Log** (`/audit-log`)                | Read-only, server-mode, paginated Table: actor, action, entity, timestamp. "View" row action opens a `Dialog` with a before/after diff. No row mutation actions at all. | Cheap — it's a table with no write actions.                                                                                                                                        |
| **Settings** (`/settings`)                  | A Form: org name, default environment, session timeout, notification preferences.                                                                                       | One more `FormRenderer` instance.                                                                                                                                                  |
| **Role & Permission Management** (`/roles`) | Table + Form pair for defining roles → permission sets.                                                                                                                 | **Only if your backend actually owns role definitions** — if roles come from an external IdP (Okta/Azure AD groups, say), this screen doesn't apply. Depends on the §4.2 decision. |
| **Notifications** (topbar bell)             | A dropdown of recent system notifications.                                                                                                                              | Lower priority — proposed for a later phase, not scoped yet.                                                                                                                       |

Slotted into the roadmap as Phase 9 (§14), after the core engines and auth are solid — building admin screens on top of an unfinished engine would mean redoing them.

---

## 13. Enterprise Concerns (additions to v2's checklist)

- **Security — defense in depth:** `proxy.ts`'s redirect is UX, not the security boundary; the real check is the server-side `auth()` call in `app/(admin)/layout.tsx` (§4.4). Don't add a second route group later without repeating that check.
- **Token hygiene:** the backend access token is carried inside the NextAuth-managed, httpOnly session cookie flow — `useApiFetcher` reads it from `useSession()`; it's never stored in `localStorage`.
- **Tenant isolation:** every `useApiFetcher` call sends `X-Tenant-Id` — if a backend endpoint ever forgets to scope by that header, that's a backend bug to catch in integration tests, not something the frontend can paper over.

---

## 14. Implementation Roadmap (updated)

| Phase | Scope                                                                                                                                                                                      | Exit criteria                                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | ✅ Delivered — 14 primitives + Toast, per-component folders, co-located specs                                                                                                              | Done                                                                                                                                                                 |
| 0b    | Full token set (spacing/typography/shadow/z-index/motion) + App Shell (Sidebar/BottomNav/Topbar/AppShell)                                                                                  | Shell renders correctly at 375px and 1280px                                                                                                                          |
| 0c    | Auth: NextAuth (Auth.js v5) Credentials + JWT, `resolve-roles`, `refresh-token`, `proxy.ts` (Thin Proxy), `(admin)/layout.tsx` server check, login screen                                  | Unauthenticated visit redirects; valid login lands on `/`; session carries roles/permissions/tenants; confirmed `proxy.ts` runtime works with the Auth.js v5 wrapper |
| 0d    | RBAC Sidebar + BottomNav (role/permission filtering) + Topbar (Environment + Tenant switchers, user menu)                                                                                  | Nav item visibility matches session role in tests; switching env/tenant changes the header/base-URL a mocked fetch receives                                          |
| 0e    | BFF proxy (`app/api/proxy/[...path]`, `backend-client.server.ts`), CSP nonce + security headers in `proxy.ts`, `server-only`-enforced env config                                           | Network tab shows only same-origin `/api/proxy/*`; CSP report-only mode logs zero violations before flipping to enforced                                             |
| 0f    | Tooling: Husky + lint-staged + commitlint + gitleaks, `stylelint-declaration-strict-value`, `eslint-plugin-tailwindcss` `no-arbitrary-value`, `sonar-project.properties` + CI quality gate | A commit with a raw hex color, an arbitrary Tailwind value, or a leaked-looking token is rejected locally before it reaches CI                                       |
| 1     | Form engine: types, `schema-to-zod`, field registry, `FormRenderer`, `FormActions` (all four `type`s incl. `button`+`onClick`)                                                             | Sample form renders/validates/submits; a `button` action runs unvalidated, a `submit` action with `onClick` skips the default POST                                   |
| 2     | Select/Combobox: static + remote `optionsSource`                                                                                                                                           | Both sources covered by tests                                                                                                                                        |
| 3     | Table engine, client mode: columns, pagination/filter/search, `display.mobile` scroll/cards                                                                                                | Fully interactive client-side at both breakpoints                                                                                                                    |
| 4     | Table engine, server mode: data source adapter using `useApiFetcher` (through the BFF proxy)                                                                                               | Server-mode table's requests all resolve to `/api/proxy/*` in the network tab                                                                                        |
| 5     | Row/bulk actions (incl. `onClick`), confirm dialogs, permission gates                                                                                                                      | Destructive action requires confirm; permission hides action; `onClick` action bypasses `endpoint`                                                                   |
| 6     | Toast integration across form + table + auth (sign-out)                                                                                                                                    | Every `onSuccess`/`onError`/sign-out path visibly toasts                                                                                                             |
| 7     | i18n rollout, incl. `auth.json` + RTL shell mirroring                                                                                                                                      | Second locale (one RTL) fully functional                                                                                                                             |
| 8     | Vitest suite (§15) + Playwright `responsive.spec.ts` + `auth.spec.ts` + SonarQube quality gate green                                                                                       | ≥80% coverage on engine + auth code, CI green, 0 Sonar bugs/vulnerabilities/hotspots                                                                                 |
| 9     | Platform Admin screens: User Management, Audit Log, Settings                                                                                                                               | Each built as a JSON schema against the finished engines                                                                                                             |
| 10    | Docs + Storybook playground + perf pass (virtualized tables) + CSP flipped from report-only to enforced in production                                                                      | Non-engineers can author a schema and preview it; CSP violations are zero for a full week of report-only logging before enforcing                                    |

---

## 15. Vitest + Playwright Testing (additions to v2's §10/§12)

**New Vitest specs:**

- `resolve-roles.test.ts` — embedded-in-response case, separate-endpoint case, failure case (empty arrays, no throw).
- `refresh-token.test.ts` — valid token passed through untouched; expired token triggers a refresh call; failed refresh sets `token.error`.
- `sidebar.test.tsx` — item with `roles: ["admin"]` hidden for a `useSession` mock lacking that role, shown when present; item with neither `roles` nor `permission` always shown; same fixture reused for `bottom-nav.test.tsx` to prove parity.
- `environment-switcher.test.tsx` / `environment-provider.test.tsx` — switching updates what a consumer reads, persists to a cookie.
- `tenant-switcher.test.tsx` / `tenant-provider.test.tsx` — same, tenant list sourced from a mocked session.
- `use-api-fetcher.test.ts` — calling it with `/employees` fetches `/api/proxy/employees` (same-origin, relative) and nothing else — asserting no `Authorization` header and no external host ever appears in the call the client makes.
- `backend-client.test.ts` — given a mocked `envId`/`tenantId`/`accessToken`, builds the correct upstream URL and headers; unknown `envId` falls back to `production` rather than throwing.
- `proxy/[...path]/route.test.ts` — no session → 401, no upstream call made; valid session → upstream called with `Authorization: Bearer <token>` and `X-Tenant-Id` from cookies, and the client-facing response never contains those headers; a mocked backend 500 with a stack trace in the body is not relayed verbatim (once the sanitization TODO from §6.2 is implemented — track this test as the thing that proves it's actually implemented, not just planned).
- `proxy.test.ts` (the CSP one, not the auth flow one) — response includes `Content-Security-Policy` with `'strict-dynamic'` and a `nonce-` value that changes between two separate calls (proves it's per-request, not a hardcoded string); no `unsafe-eval` appears anywhere in the header value.
- `form-actions.test.tsx` (extended from v2) — a `type: "button"` action with `onClick` fires immediately, without triggering RHF validation, even with an invalid form; a `type: "submit"` action with `onClick` still validates first, then calls the handler instead of hitting `endpoint`.

**New Playwright spec (`e2e/auth.spec.ts`):** unauthenticated visit to `/` redirects to `/login`; valid credentials land on `/`; a role-gated nav item is absent from both the sidebar and bottom nav for a seeded low-privilege test user. This layer exists because a _real_ redirect and a _real_ narrow viewport are the two things jsdom fundamentally can't simulate — same reasoning as `e2e/responsive.spec.ts` in v2.

**New Playwright spec (`e2e/security-headers.spec.ts`):** loads a real page and asserts the actual browser-received `Content-Security-Policy` header and that no console CSP violation was logged — the one check that's worth doing against a real browser rather than a mocked response, since CSP enforcement is a browser behavior, not application logic.

---

## 16. Security Hardening — CSP & VAPT Checklist

You asked for VAPT-standard hardening specifically calling out `unsafe-eval`, `unsafe-inline`, and inline CSS. Here's the actual policy and the one place it's genuinely in tension with a library we're already using — flagged honestly rather than glossed over.

### 16.1 Content Security Policy — nonce-based, generated per request in `proxy.ts`

A static CSP in `next.config.js` can't include a nonce (it has to be different every request), so nonce generation happens in `proxy.ts` — legitimate "network boundary" work, squarely inside Thin Proxy's job description (§4.4):

```ts
// proxy.ts (extending §4.4's version)
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(
    crypto.getRandomValues(new Uint8Array(16)),
  ).toString("base64"); // crypto-secure, NOT Math.random() -- see §18's SonarQube S2245

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`, // see 17.2 for the one honest exception
    `img-src 'self' data:`,
    `font-src 'self'`,
    `connect-src 'self'`, // true because of the BFF proxy in §6 -- nothing else to allow
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
  ].join("; ");

  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  });
  response.headers.set("x-nonce", nonce); // root layout reads this via headers() to tag its own inline scripts
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return response;
}
```

No `unsafe-eval` and no `unsafe-inline` for scripts, anywhere. `strict-dynamic` means the nonce'd root script can load its own child bundles without needing to allowlist every chunk URL.

**Rollout, not a flag day:** ship this first as `Content-Security-Policy-Report-Only` (same header value, different header name) pointed at a `report-uri`/`report-to` collector, run it for a full release cycle watching for violations from something we didn't anticipate (a third-party script, a browser extension, whatever), and only then switch the header name to the enforcing `Content-Security-Policy`. Flipping a strict CSP straight to enforced with no observation period is how you find out what broke from a support ticket instead of a dashboard.

### 16.2 The one honest exception: inline `style` attributes from Radix's positioning

Radix's floating-UI-based positioning (`Select`, `Popover`, `DropdownMenu` content) sets `style.transform`/`style.position` via inline JS on the element — that's a `style="..."` HTML _attribute_, not a `<style>` _tag_. CSP nonces only cover `<style>` tags and `<link>`, never inline attributes — there's no nonce mechanism for those in any browser, for anyone, with any library. So a literal zero-`unsafe-inline` policy for `style-src` is not achievable without replacing Radix's positioning entirely (the CSS Anchor Positioning API could do it, but browser support isn't broad enough yet to rely on for an enterprise app).

**What real audits accept here, and what this plan does:** keep `script-src` fully strict (nonce + `strict-dynamic`, zero exceptions — this is where actual code-execution/XSS risk lives) and scope the exception narrowly: `style-src 'self' 'unsafe-inline'`. A CSS-injection risk is real but categorically smaller than script injection, and this is such a common, well-understood limitation of any floating-UI-based component library that VAPT reports routinely accept it with a documented justification — which this paragraph is. If your policy genuinely can't accept any `style-src` exception, the fallback is dropping Radix's Popper positioning for Select/Popover/DropdownMenu and hand-rolling CSS-only positioning (real scope increase — flag it if this is a hard requirement, not a nice-to-have, so it can be sized properly).

### 16.3 "100% tokenized," enforced, not just documented

§3 already defines the full token set; this makes violating it a build failure instead of a code-review hope:

- **Raw CSS:** `stylelint-declaration-strict-value` (a stylelint plugin built exactly for this) fails the build on any `color`, `background`, `padding`, `margin`, `border-radius`, `box-shadow`, or `z-index` declaration that isn't a `var(--...)`.
- **Tailwind arbitrary values:** `eslint-plugin-tailwindcss`'s `no-arbitrary-value` rule fails on `bg-[#ff0000]`-style escapes that bypass the token-mapped scale in `tailwind.config.ts`.
- Both run in `lint-staged` (§17) and again in CI, so neither is optional or bypassable by skipping a local hook.

### 16.4 Rest of the VAPT checklist this plan already satisfies, or now does

| Concern                                                               | Status                                                                                                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend URL / bearer token visible in Network tab                     | Closed by the BFF proxy (§6)                                                                                                                      |
| `unsafe-eval` / `unsafe-inline` in `script-src`                       | Closed (17.1)                                                                                                                                     |
| `connect-src` wildcard                                                | Closed — `'self'` only, because of §6                                                                                                             |
| Verbose backend error/stack trace leakage to browser                  | Proxy sanitizes responses (§6.4) — needs the real mapping built in Phase 0e, currently a flagged TODO in the route sketch                         |
| `dangerouslySetInnerHTML` / stored XSS via the `rich-text` field type | Not built yet (§8's registry lists it) — when it is, output must go through DOMPurify before render; tracked in §18's SonarQube rule list (S4634) |
| Secrets committed to source                                           | Husky pre-commit secret scan (§17)                                                                                                                |
| Clickjacking                                                          | `frame-ancestors 'none'` (17.1)                                                                                                                   |
| Cross-tenant data leakage                                             | `X-Tenant-Id` enforced server-side only, inside the proxy (§6.2) — not client-settable                                                            |
| Session/token storage                                                 | httpOnly NextAuth cookie only, never `localStorage` (§13, carried from v3)                                                                        |

---

## 17. Husky, Lint-Staged & Commit Hygiene

```
.husky/
  pre-commit      # lint-staged (ESLint --fix, Prettier, stylelint --fix) + secret scan
  commit-msg       # commitlint against Conventional Commits
  pre-push         # tsc --noEmit + vitest run (fast: unit/integration, not e2e)
commitlint.config.ts
```

```bash
# one-time setup
npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional gitleaks
npx husky init
```

```json
// package.json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{css}": ["stylelint --fix"],
  "*.{json,md}": ["prettier --write"]
}
```

```bash
# .husky/pre-commit
npx lint-staged
gitleaks protect --staged --redact   # fails the commit if it detects an API key/token/credential pattern
```

```bash
# .husky/commit-msg
npx --no -- commitlint --edit "$1"
```

```bash
# .husky/pre-push
npx tsc --noEmit
npx vitest run
```

Full `next build`, the Playwright e2e suite, and the SonarQube scan (§18) are deliberately **not** in `pre-push` — they're too slow for a local hook and belong in CI, where they gate the merge instead of gating every push.

---

## 18. SonarQube Coverage

```properties
# sonar-project.properties
sonar.projectKey=enterprise-ui-system
sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.test.ts,**/*.test.tsx
sonar.exclusions=**/*.test.ts,**/*.test.tsx,**/node_modules/**
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.qualitygate.wait=true
```

CI step (assumed GitHub Actions + SonarCloud since neither was specified — swap for self-hosted SonarQube server + a different scanner action if that's actually your setup, the properties file is the same either way):

```yaml
- run: npx vitest run --coverage
- uses: SonarSource/sonarqube-scan-action@v4
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

**Quality gate:** 0 new bugs, 0 new vulnerabilities, 0 unreviewed security hotspots, maintainability rating A, ≥80% coverage on new code (matches the Vitest target already set in §15), <3% duplicated lines. `sonar.qualitygate.wait=true` means the CI job itself fails — not just reports — if the gate doesn't pass.

**Rules this architecture already satisfies by construction**, and a couple worth watching once the `rich-text` field and any regex-validated fields get built:

| Rule                                        | Already satisfied because                                                                           | Watch for                                                                                                                                                                                            |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S3776 Cognitive Complexity                  | Registry-pattern dispatch (field/column/action-handler registries) instead of long if/switch chains | New field types should get their own small component, not a branch added to an existing one                                                                                                          |
| S6479 no array index as React key           | Every list already keys on a stable id (`field.name`, `row.id`, `toast.id`)                         | —                                                                                                                                                                                                    |
| S107 too many function parameters           | Components take one props object, not positional args                                               | —                                                                                                                                                                                                    |
| S2068 hardcoded credentials                 | All secrets/URLs via `process.env`, non-public vars for anything server-only (§6.1)                 | —                                                                                                                                                                                                    |
| S2245 insecure randomness                   | —                                                                                                   | The CSP nonce (§16.1) must stay on `crypto.getRandomValues`, never `Math.random()`                                                                                                                   |
| S4634 unsanitized `dangerouslySetInnerHTML` | Not used anywhere yet                                                                               | When `rich-text` (§8) is built: DOMPurify the output before render, no exceptions                                                                                                                    |
| S5852 ReDoS-prone regex                     | —                                                                                                   | Any `validation.pattern` a schema author supplies (§8) should be checked for catastrophic backtracking — worth a lightweight regex-complexity lint on schema load, not just trusting the JSON author |
| S1481 unused variables                      | Standard ESLint `no-unused-vars`, already in `lint-staged` (§17)                                    | —                                                                                                                                                                                                    |

---

## 19. Open Assumptions to Confirm

- **Auth.js v5 vs. Better Auth:** you asked for NextAuth specifically, so this plan uses Auth.js v5 (still tagged `beta` on npm, but the maintainers have called it production-ready since late 2024 — the "beta" label is stale, not a real risk signal). Worth knowing for later: as of 2026 Auth.js is in maintenance mode and new feature work has shifted to **Better Auth**, a newer self-hosted alternative some teams are choosing for new projects. Not recommending a switch — just flagging it in case you want to weigh in before code gets written, since retrofitting later is real work.
- **Roles/permissions source:** genuinely open per your answer — §4.2's `resolve-roles.ts` is built so either answer (embedded in login response, or a separate `/me` call) is a one-file change, nothing else in the app cares.
- **Refresh-token endpoint:** §4.3 assumes your backend has (or will have) `POST /auth/refresh` accepting a `refreshToken`. If it doesn't, we either need silent re-login on expiry or a different rotation approach — let me know before Phase 0c.
- **Tenant switching mechanics:** assumed to be "same session, different `X-Tenant-Id` header" (§6). If your backend instead requires a re-scoped token per tenant, that's contained to `TenantProvider.setActive`.
- **Environment list source:** assumed to be a small static list from env vars (§6). If it should be dynamic/admin-managed (e.g., ops can add a new environment without a redeploy), that becomes a small config endpoint instead — flag it if so.
- **CSP `style-src` exception (§16.2):** this is the one place this plan makes a judgment call rather than fully satisfying "no unsafe-inline anywhere" — `style-src` allows `'unsafe-inline'` because Radix's positioning has no alternative under current CSP. If your VAPT process needs explicit sign-off on accepted-risk items, this is the one to put in front of whoever owns that process before Phase 0e, not after.
- **CI provider & SonarQube hosting (§18):** assumed GitHub Actions + SonarCloud since neither was specified — the `sonar-project.properties` file doesn't change either way, but the pipeline YAML does if it's actually GitLab CI, Jenkins, Azure DevOps, or a self-hosted SonarQube server. Let me know which and I'll write the real pipeline config instead of the illustrative one in §18.
- **`gitleaks` false positives:** secret-scanning tools occasionally flag high-entropy strings that aren't actually secrets (test fixtures, generated IDs). Budget a small `.gitleaksignore` pass during Phase 0f setup rather than being surprised by it mid-development.
