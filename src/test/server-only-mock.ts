// Vitest runs in plain Node, not Next.js's "react-server" condition, so the
// real `server-only` package (which unconditionally throws outside that
// condition) would fail every test that imports a server-only module.
// vitest.config.mts aliases "server-only" to this no-op for the test run
// only; the real package still enforces the boundary in `next build`.
export {};
