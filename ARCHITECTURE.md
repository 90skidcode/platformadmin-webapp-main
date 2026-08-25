# Architecture

What's actually implemented in this repo, how it maps to
[`enterprise-ui-system-plan.md`](./enterprise-ui-system-plan.md), and where to
look for each piece. Read the plan first for the _why_; this document is the
_where_ and the _what actually shipped vs. what changed along the way_.

## Quick start

```bash
pnpm install
pnpm dev            # http://localhost:3100 (pinned -- see "Dev port" below)
pnpm test           # Vitest, 169 tests
pnpm lint           # ESLint (tailwindcss/no-arbitrary-value, sonarjs, prettier)
pnpm stylelint      # token enforcement on raw CSS
```

Demo accounts (seeded in `src/mocks/db.ts`):

| Email                    | Password      | Role             | Notes                                                                         |
| ------------------------ | ------------- | ---------------- | ----------------------------------------------------------------------------- |
| `admin@platform.local`   | `Admin123!`   | `platform-admin` | Full access                                                                   |
| `manager@platform.local` | `Manager123!` | `manager`        | Can't reach Settings' save button (has `settings.read`, not `settings.write`) |
| `viewer@platform.local`  | `Viewer123!`  | `viewer`         | Read-only; Settings nav item hidden entirely (role-gated)                     |

### Dev port

Port 3000 may already be in use by another local project. `dev`/`start` are
pinned to **3100** in `package.json`, and every env var / config file that
references a URL (`.env.local`) assumes that port.

## What's real vs. mocked

Everything runs against **this repo's own mock backend**
(`src/app/api/mock-backend/**`, an in-memory store in `src/mocks/db.ts`) --
not a real backend, per §19's open assumptions. Swapping in a real one is
meant to be an env var change (`AUTH_API_URL`, `API_URL_*`), not a code
change; nothing above the BFF proxy layer should need to know the
difference. The mock backend is also the thing route handler tests
(`route.test.ts`) actually exercise, so the contracts it implements are
load-bearing, not just fixtures.

## Phase-by-phase map

| Plan phase                        | Status                                                  | Where                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0/0b -- primitives, tokens, Toast | Done                                                    | `src/styles/tokens.css`, `src/components/ui/*` (14 primitives), `src/components/toast/*`                                                                      |
| 0c -- Auth (NextAuth v5)          | Done                                                    | `src/auth/*`, `src/app/login/page.tsx`, `src/app/(admin)/layout.tsx`                                                                                          |
| 0d -- RBAC shell                  | Done                                                    | `src/components/app-shell/*`, `src/lib/environment`, `src/lib/tenant`                                                                                         |
| 0e -- BFF proxy                   | Done                                                    | `src/app/api/proxy/[...path]/route.ts`, `src/lib/backend-client/*`                                                                                            |
| 0f -- tooling                     | Done                                                    | `.husky/*`, `commitlint.config.ts`, `stylelint.config.mjs`, `eslint.config.mjs`, `.secretlintrc.json`, `sonar-project.properties`, `.github/workflows/ci.yml` |
| 1/2 -- form engine                | Done                                                    | `src/components/form/*`                                                                                                                                       |
| 3/4/5 -- table engine             | Done                                                    | `src/components/table/*`                                                                                                                                      |
| 6 -- toast integration            | Done                                                    | `src/lib/action-handlers/action-result.ts` (`triggerToastFromConfig`), wired into both engines and `Topbar`'s sign-out                                        |
| 7 -- i18n                         | Done (scope note below)                                 | `src/i18n/request.ts`, `src/messages/{en,ar}/*.json`                                                                                                          |
| 8 -- testing                      | Done (Playwright layer removed -- see deviations below) | 169 Vitest specs co-located with source                                                                                                                       |
| 9 -- Platform Admin screens       | Done                                                    | `src/app/(admin)/{users,audit-log,settings}/page.tsx`                                                                                                         |
| 10 -- docs + perf                 | Done                                                    | this file; `schema.virtualize` (table engine), demoed in `/style-guide`                                                                                       |

Storybook (also listed under plan §10) was **not** built -- a real, separate
tool integration, not a config tweak, and out of scope for this pass.

## Load-bearing decisions and deviations from the plan

These are real choices made while building, each with a reason -- flagged
here rather than left implicit, matching the plan's own style of naming its
assumptions instead of burying them.

- **TanStack Table v9 → pinned to v8.** v9 had just shipped when this was
  built, with a structurally different API (feature-flag registration
  instead of `useReactTable` + row-model options) that its own bundled
  migration notes flag as a common source of mistakes. Correctness over
  bleeding-edge; v8 is what every example and every test in this codebase
  is written against.
- **`AUTH_TRUST_HOST: true`** in `auth.config.ts`. Vercel/Netlify set
  `AUTH_TRUST_HOST` automatically; a self-hosted `next start` (what this repo
  actually runs) doesn't get that for free, and NextAuth refuses every
  request in production mode without it (`UntrustedHost` error). Found by
  actually running the Playwright suite against a production build, not by
  inspection.
- **`proxy.ts`'s matcher includes `/login`.** An earlier version excluded it
  (to avoid a self-redirect loop), which also meant the login page shipped
  with **no CSP or security headers at all** -- the one page most exposed to
  an attacker. Fixed: `/login` now gets the same headers as every other
  page; the redirect-loop guard is a separate in-function check
  (`isLoginRoute`), not a routing exclusion.
- **`gitleaks` → `secretlint`.** The plan names `gitleaks` for the pre-commit
  secret scan, but the `gitleaks` npm package is an unrelated name-squat, not
  the real Go binary. `secretlint` is genuinely npm-native and does the same
  job; see `.secretlintrc.json` and `.secretlintignore`.
- **`stylelint-config-standard` deliberately not extended.** It doesn't know
  Tailwind v4's CSS-first syntax (`@theme`, `@plugin`, bare
  `@import "tailwindcss"`) and its stylistic rules (hex length, alpha
  notation) are unrelated to §16.3's actual goal -- token enforcement, not
  general CSS style. `stylelint.config.mjs` only carries
  `stylelint-declaration-strict-value` plus the Tailwind at-rule allowlist.
- **`duration-*` Tailwind utilities don't take named theme values.** Verified
  empirically (a real `next build`, inspecting the compiled CSS): unlike
  `ease-*`/`z-index-*`, Tailwind v4's `duration-*` utility doesn't read
  custom `@theme` entries -- a `duration-fast` class silently emits no CSS
  rule at all. `z-*` and `ease-*` are registered as real token-backed
  utilities in `tokens.css`; `duration-[var(--duration-fast)]` stays
  arbitrary-value syntax, with a `tailwindcss/no-arbitrary-value`
  suppression and a comment explaining why, in every place it's used.
- **i18n has no `[locale]` URL segment.** The plan's own folder tree (§2)
  never shows one, and every admin route already sits under `app/(admin)/`;
  locale is cookie-based (`NEXT_LOCALE`), resolved server-side in
  `src/i18n/request.ts`. `ar` was added as the RTL locale (plan §7's exit
  criteria); the pre-existing `en`/`ta` locale files under `src/locales/`
  predate this build and are unrelated to the new namespaced
  `src/messages/{locale}/*.json` structure -- left alone, not migrated.
- **Table virtualization replaces pagination, not nests inside it.**
  `schema.virtualize: true` only helps in `mode: "client"`, and only once
  pagination is turned off -- virtualizing a single already-paginated
  10-row page does nothing (found by writing the Playwright check for it:
  the DOM row count only dropped once pagination was actually skipped for
  the virtualized case). See `src/components/table/table-renderer.tsx`'s
  `clientVirtualize` branch.
- **Playwright removed (2026-08-17).** The plan's §15 e2e layer (`e2e/`,
  `playwright.config.ts`, the CI `e2e` job) was deleted at the repo owner's
  request. This is a real coverage loss with no Vitest/jsdom equivalent:
  jsdom has no navigation layer (can't verify the unauthenticated
  `/` → `/login` redirect actually fires), no layout engine (can't verify
  the Sidebar/BottomNav breakpoint swap at real viewport widths), and no
  real HTTP response (can't observe `proxy.ts`'s actual
  `Content-Security-Policy`/nonce/`X-Content-Type-Options` headers -- a
  mocked `fetch` has none). The Vitest specs that already existed alongside
  the Playwright ones for the _jsdom-reachable_ parts of the same code
  (`app-shell.test.tsx`'s composition check, `table-renderer.test.tsx`'s
  faked-`offsetHeight` virtualization check) still stand; nothing about
  those changed.
- **All 11 Radix primitives replaced with local implementations
  (2026-08-17), at the repo owner's explicit request for zero 3rd-party UI
  dependencies.** `@radix-ui/react-{alert-dialog,avatar,checkbox,dialog,
dropdown-menu,label,select,slot,switch,toast,tooltip}` are gone from
  `package.json`; every `src/components/ui/*` wrapper now sits on a shared
  `src/components/ui/primitives/` layer built for this
  (`slot.tsx`, `portal.tsx`, `use-controllable-state.ts`, `use-escape-key.ts`,
  `use-outside-click.ts`, `use-focus-trap.ts`, `use-body-scroll-lock.ts`,
  `use-popover-position.ts`, `use-presence.ts`, `dialog-base.tsx`'s
  `createDialog()` factory shared by Dialog/AlertDialog). `@tanstack/
react-table` and `@tanstack/react-virtual` were explicitly kept (repo
  owner's call -- different kind of complexity, data/scroll logic rather
  than UI chrome).
  - **Reduced API surface, on purpose.** `DropdownMenu{Sub,SubTrigger,
SubContent,CheckboxItem's full parity,RadioItem,RadioGroup,Group,
Portal}` and `Select{Group,Separator}` were dropped rather than
    reimplemented -- grepped confirmed nothing in this codebase ever
    imports them; less unused, untested surface area beat parity for its
    own sake.
  - **Real bugs this surfaced that jsdom tests couldn't** (jsdom has no
    real layout/`getBoundingClientRect`/pointer-capture semantics, so all
    three were only caught by driving an actual Chromium instance against
    a production build): (1) `usePopoverPosition`'s layout effect,
    keyed on logical `open` state, could fire and measure
    `contentRef.current` _before_ the portaled DOM node existed (because
    `usePresence`'s own "has this actually mounted" state lags one render
    behind `open`) and then never got a second chance -- DropdownMenu/
    Select/Tooltip content rendered permanently at `opacity: 0`, invisible
    but still fully clickable by ARIA role. Fixed by keying the effect on
    `usePresence`'s `rendered` flag instead of `open`. (2) `dialog.tsx`/
    `alert-dialog.tsx` called `createDialog()` (a client-only factory) at
    module scope without their own `"use client"` directive -- passed
    `next build`'s webpack bundling but failed the actual RSC boundary
    check with `Attempted to call createDialog() from the server`; the
    original Radix-based versions never needed the directive since they
    only ever _referenced_ Radix's own already-client-tagged exports,
    never _called_ a function. (3) Toast's swipe-to-dismiss called
    `setPointerCapture()` on every `pointerdown` inside the toast,
    including ones that started on `ToastClose` itself -- real Chromium
    honors that capture and the close button's own click never fired
    (100% test-passing in jsdom, which doesn't implement real pointer
    capture, and 100% broken in a real browser). Fixed by skipping
    swipe-tracking when the pointerdown target is inside a
    `button`/`a`/`[role=button]`.
  - **Verified**, not just asserted: full Vitest suite green, `tsc`/
    `eslint` clean, `jscpd` duplication stayed under the pre-commit
    threshold (2.17%, was 2.19% before this), and a real `next build &&
next start` driven by a throwaway Playwright script (not reintroduced
    as a project dependency -- used once, ephemerally, from the
    scratchpad) exercising Dialog/AlertDialog/DropdownMenu/Select/
    Tooltip/Toast end to end, screenshotted, zero console/page errors.

## A pre-existing, unrelated system in this repo

`src/services/*`, `src/hooks/use-auth.ts`, `src/lib/utils/validation.ts`, and
`src/schemas/{auth,user}-schema.ts` implement a **phone/OTP login flow** via
cookies and an axios client, under an app name of `"Kyber AI"`
(`src/config/app.ts`) -- not this plan's NextAuth/email-password/JWT model,
and not written as part of this build. Nothing in the new code imports these
files (verified); they're excluded from lint (see `eslint.config.mjs`'s
`globalIgnores`) rather than deleted, since removing code that predates this
session and that wasn't asked about is a call for whoever owns this repo to
make, not this build.

## Testing

- **Vitest** (`pnpm test`): 169 specs, co-located with source
  (`*.test.ts(x)` next to the file it tests). Covers engines, auth,
  permissions, providers, and the mock-backend route handlers themselves.
- **Playwright removed.** See "Load-bearing decisions and deviations from
  the plan" above for what was covered and what's now uncovered as a
  result.
- **CI** (`.github/workflows/ci.yml`): typecheck, lint, stylelint, secret
  scan, unit tests + coverage, build, SonarCloud scan.

## Security posture (plan §16)

- CSP is nonce-based, generated fresh per request in `src/proxy.ts`, shipped
  as `Content-Security-Policy-Report-Only` by default
  (`CSP_ENFORCED=true` flips it to enforcing -- flip only after a full
  release cycle of report-only logging with zero unexpected violations, per
  the plan's own rollout guidance).
- `script-src` has no `unsafe-eval`/`unsafe-inline`, ever. `style-src`
  allows `unsafe-inline` -- the one documented exception, needed because
  popover positioning (`src/components/ui/primitives/use-popover-position.ts`
  -- the local Dialog/DropdownMenu/Select/Tooltip stand-in for what used to
  be Radix's floating-UI positioning, see the deviations list above) and
  Toast's swipe-gesture offset both set inline `style` _attributes_
  (transform/position/custom properties) that no CSP nonce mechanism can
  cover in any browser, for any implementation.
- The backend access token never reaches the browser: it lives in the
  httpOnly NextAuth session cookie, attached server-side by the BFF proxy
  (`src/app/api/proxy/[...path]/route.ts`). The browser's Network tab only
  ever shows same-origin `/api/proxy/*` calls.
- `tailwindcss/no-arbitrary-value` and `stylelint-declaration-strict-value`
  both actually fail the build on raw hardcoded values -- not documentation,
  enforcement (plan §16.3's explicit ask).
