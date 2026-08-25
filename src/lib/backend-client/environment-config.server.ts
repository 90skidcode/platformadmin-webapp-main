// §6.1: the only place the real backend URL lives. `server-only` fails the
// build if any client component ever imports this file, rather than relying
// on everyone remembering not to add a NEXT_PUBLIC_ prefix.
//
// One `API_URL` per deployment (.env.local / .env.staging / .env.production)
// -- `_envId` is accepted for call-site compatibility with the in-app
// environment switcher (§ admin-environment cookie) but no longer selects
// between multiple backend URLs.
import "server-only";

export function resolveBaseUrl(_envId: string): string {
  return process.env.API_URL ?? "";
}
