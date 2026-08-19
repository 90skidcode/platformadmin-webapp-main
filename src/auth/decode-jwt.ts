/**
 * The real backend's `/auth/login` response carries no `user`/`roles`
 * payload at all -- just a token pair (see auth.config.ts). The access
 * token is itself a JWT though, so this pulls `sub`/`exp` out of its
 * payload instead of inventing a round-trip the backend doesn't support.
 *
 * Not a signature check -- the backend already validated the token before
 * issuing it, so this only ever reads a token this app itself just
 * received over HTTPS from that backend. Never use this to authorize a
 * token handed in by someone else.
 */
export function decodeJwtPayload(
  token: string,
): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(payload, "base64url").toString("utf-8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
