// §6.2: shared fetch+header logic. The BFF proxy route and any Server
// Component / Server Action that talks to the backend directly both call
// this -- one implementation, two callers.
import "server-only";

import { resolveBaseUrl } from "./environment-config.server";

export interface BackendCallContext {
  accessToken: string;
  envId: string;
  tenantId: string;
}

export async function callBackend(
  path: string,
  options: RequestInit,
  ctx: BackendCallContext,
): Promise<Response> {
  const baseUrl = resolveBaseUrl(ctx.envId);
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${ctx.accessToken}`,
      "X-Tenant-Id": ctx.tenantId,
    },
  });
}
