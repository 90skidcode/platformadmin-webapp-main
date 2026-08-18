/**
 * Roles/permissions/tenants source is genuinely open (plan §4.2, §19) --
 * whichever way the backend team lands, this is the only file that changes.
 * Everything downstream (Sidebar, action `permission` gates, route checks)
 * reads the normalized `ResolvedAccess` shape this function returns.
 */
import "server-only";

import type { ApiEnvelope } from "@/lib/api-envelope";

export interface LoginResponse {
  user: { id: string; name: string; email: string };
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: number;
  roles?: string[];
  permissions?: string[];
  tenants?: { id: string; name: string }[];
}

export interface ResolvedAccess {
  roles: string[];
  permissions: string[];
  tenants: { id: string; name: string }[];
}

export async function resolveAccess(
  loginResponse: LoginResponse,
  accessToken: string,
): Promise<ResolvedAccess> {
  // 1) Roles/permissions embedded directly in the login response.
  if (loginResponse.roles || loginResponse.permissions) {
    return {
      roles: loginResponse.roles ?? [],
      permissions: loginResponse.permissions ?? [],
      tenants: loginResponse.tenants ?? [],
    };
  }

  // 2) Fall back to a separate endpoint.
  try {
    const res = await fetch(`${process.env.API_URL}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`GET /me failed with ${res.status}`);
    const body = (await res.json()) as ApiEnvelope<{
      roles?: string[];
      permissions?: string[];
      tenants?: { id: string; name: string }[];
    }>;
    return {
      roles: body.data.roles ?? [],
      permissions: body.data.permissions ?? [],
      tenants: body.data.tenants ?? [],
    };
  } catch {
    console.warn(
      "[auth] Could not resolve roles/permissions -- defaulting to no access. Check the /me endpoint or the login response shape.",
    );
    return { roles: [], permissions: [], tenants: [] };
  }
}
