// §6.1: the only place the real per-environment backend URLs live. `server-only`
// fails the build if any client component ever imports this file, rather than
// relying on everyone remembering not to add a NEXT_PUBLIC_ prefix.
import "server-only";

export const ENVIRONMENT_BASE_URLS: Record<string, string> = {
  dev: process.env.API_URL_DEV ?? "",
  staging: process.env.API_URL_STAGING ?? "",
  production: process.env.API_URL_PROD ?? "",
};

export function resolveBaseUrl(envId: string): string {
  return ENVIRONMENT_BASE_URLS[envId] || ENVIRONMENT_BASE_URLS.production;
}
