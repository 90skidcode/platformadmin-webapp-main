# Platform Admin WebApp

A JSON-schema-driven enterprise admin platform: define a form or a table as
JSON, get a validated, permission-gated, i18n'd UI for free. Built against
[`enterprise-ui-system-plan.md`](./enterprise-ui-system-plan.md) -- see
[`ARCHITECTURE.md`](./ARCHITECTURE.md) for what actually shipped, how it maps
to that plan, and every deviation from it (with the reason).

## Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 ·
locally-built UI primitives (no Radix -- see `src/components/ui/primitives/`)
paired with `class-variance-authority` · `react-hook-form` + `zod` ·
`@tanstack/react-table` v8 + `@tanstack/react-virtual` · NextAuth (Auth.js)
v5 · `next-intl` · Vitest + Testing Library · Husky, lint-staged,
commitlint, and secretlint · stylelint + `eslint-plugin-tailwindcss`

## Getting started

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3100> -- **note the port**: 3100, not 3000 (pinned in
`package.json`/`.env.local`; see `ARCHITECTURE.md` for why). Sign in with one
of the seeded demo accounts shown on the login page, or in
`ARCHITECTURE.md`'s quick-start table.

Everything runs against this repo's own in-memory mock backend
(`src/app/api/mock-backend/**`) -- no external services required.

### Scripts

| Command                                                | What it does                                 |
| ------------------------------------------------------ | -------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`               | Next.js dev/build/start, pinned to port 3100 |
| `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` | Vitest                                       |
| `pnpm lint`                                            | ESLint                                       |
| `pnpm stylelint`                                       | stylelint (design-token enforcement)         |

## Project structure

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full phase-by-phase map.
Highlights:

```
src/
  app/
    login/                  # login page (dogfoods the form engine)
    (admin)/                # auth-gated route group: dashboard, users, audit-log, settings, style-guide
    api/
      auth/[...nextauth]/   # NextAuth handlers
      proxy/[...path]/      # BFF proxy -- the only place the real backend URL + token meet
      mock-backend/         # this repo's stand-in backend
  auth/                     # NextAuth config, role/permission resolution, token refresh
  components/
    ui/                     # 14 token-driven primitives (local -- no Radix -- + cva)
    form/                   # JSON-schema-driven form engine
    table/                  # JSON-schema-driven table engine (client/server mode, virtualization)
    app-shell/              # Sidebar, BottomNav, Topbar, environment/tenant switchers
    toast/
  lib/                      # permissions, environment/tenant providers, BFF client, action-handlers
  schemas/{forms,tables}/   # the actual JSON schemas driving the Platform Admin screens
  messages/{en,ar}/         # i18n, namespaced (ar is the RTL locale)
  styles/tokens.css         # every design token; nothing hardcoded elsewhere
```

## Deployment

Any platform that supports Next.js (Vercel, Netlify, self-hosted/Docker).
For self-hosted production (`next start`, not a platform that sets
`AUTH_TRUST_HOST` for you), see the `AUTH_TRUST_HOST` note in
`ARCHITECTURE.md` -- it's already set in `src/auth/auth.config.ts`.
