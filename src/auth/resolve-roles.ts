/**
 * Roles/permissions/tenants source is optional/pluggable.
 * Reads roles from the login response if present, or optionally falls back to `/me`.
 * Returns default empty arrays if no role endpoint is present.
 */
import "server-only";

import type { ApiEnvelope } from "@/lib/api-envelope";
import { apiEndpoints } from "@/lib/api-endpoints";

export interface LoginResponse {
  access_token?: string;
  accessToken?: string;
  refresh_token?: string;
  refreshToken?: string;
  token_type?: string;
  user?: {
    id?: string;
    name?: string;
    username?: string;
    email?: string;
  };
  accessTokenExpires?: number;
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
  loginResponse?: Partial<LoginResponse> | null,
  accessToken?: string,
): Promise<ResolvedAccess> {
  // 1) Roles/permissions embedded directly in the login response.
  if (
    loginResponse?.roles ||
    loginResponse?.permissions ||
    loginResponse?.tenants
  ) {
    return {
      roles: loginResponse.roles ?? [],
      permissions: loginResponse.permissions ?? [],
      tenants: loginResponse.tenants ?? [],
    };
  }

  // 2) If access token is provided, optionally attempt /me if available
  if (accessToken && apiEndpoints.auth.me) {
    try {
      const res = await fetch(`${process.env.API_URL}${apiEndpoints.auth.me}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
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
      }
    } catch {
      // /me endpoint not available; fall back to empty access
    }
  }

  // Default fallback when no roles/permissions are configured
  return { roles: [], permissions: [], tenants: [] };
}
