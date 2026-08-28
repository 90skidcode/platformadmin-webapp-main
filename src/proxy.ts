import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16's replacement for `middleware.ts` (plan §4.4). Framed by
 * Next.js itself as "Thin Proxy": a network boundary for lightweight,
 * optimistic work -- redirects, header/cookie checks, rewrites -- never the
 * authoritative auth check. That check happens server-side in
 * `app/(admin)/layout.tsx` via `auth()`. Don't add real business logic here.
 *
 * Also carries the CSP nonce (plan §16.1) -- legitimate "network boundary"
 * work, generated fresh per request, which a static `next.config.js` header
 * can't do. The nonce is set on both the outgoing *request* headers (so
 * Next's own framework scripts self-nonce -- its documented mechanism) and
 * the response headers (the actual CSP the browser enforces); the root
 * layout also reads `x-nonce` via `headers()` for any inline script it adds.
 */
const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

// Toggle once CSP report-only monitoring (plan §16.1's rollout) has run a
// full release cycle with zero unexpected violations. Defaults to
// report-only so a first deploy can never hard-break the app on a CSP gap
// nobody's seen yet.
const CSP_ENFORCED = process.env.CSP_ENFORCED === "true";

export function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(cspHeaderName(), csp);

  const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) =>
    request.cookies.has(name),
  );
  // All pre-login auth pages must be allowed through without a session cookie,
  // same as /login itself -- otherwise an unauthenticated visitor would be
  // redirected to /login from /forgot-password, which redirects to /login
  // from /verify-otp, and so on in a redirect loop.
  const AUTH_PUBLIC_PATHS = [
    "/login",
    "/forgot-password",
    "/verify-otp",
    "/reset-password",
  ];
  const isPublicAuthRoute = AUTH_PUBLIC_PATHS.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );

  const response =
    !hasSessionCookie && !isPublicAuthRoute
      ? NextResponse.redirect(withRedirectTarget(request))
      : NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("x-nonce", nonce);
  response.headers.set(cspHeaderName(), csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return response;
}

function withRedirectTarget(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", request.nextUrl.pathname);
  return loginUrl;
}

function cspHeaderName() {
  return CSP_ENFORCED
    ? "Content-Security-Policy"
    : "Content-Security-Policy-Report-Only";
}

function buildCsp(nonce: string) {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // §16.2: the one honest exception -- Radix's floating-UI positioning sets
    // `style.transform`/`style.position` via inline JS on the element, which
    // no CSP nonce mechanism can cover (nonces only reach <style> tags/<link>,
    // never inline `style="..."` attributes, in any browser). script-src stays
    // fully strict; this is the narrowly-scoped, documented exception.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data:`,
    `font-src 'self'`,
    `connect-src 'self'`, // true because of the BFF proxy (§6) -- nothing else to allow
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
  ].join("; ");
}

function generateNonce() {
  // crypto.getRandomValues, not Math.random() -- SonarQube S2245.
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString(
    "base64",
  );
}

export const config = {
  // /login is deliberately NOT excluded here -- it's a real page that needs
  // the same CSP/security headers as everything else; `isLoginRoute` above
  // is what stops it from redirecting to itself. api/auth, api/proxy, and
  // api/mock-backend are excluded because they return JSON (api/proxy and
  // api/mock-backend also enforce their own auth -- 401 JSON, not an HTML
  // redirect a fetch() caller can't sanely follow -- see §6.2).
  matcher: ["/((?!api/auth|api/proxy|api/mock-backend|_next|favicon.ico).*)"],
};
