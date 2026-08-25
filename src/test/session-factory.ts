import type { Session } from "next-auth";

export interface BuildSessionOptions {
  id?: string;
  name?: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
  tenants?: { id: string; name: string }[];
  accessToken?: string;
  expires?: string;
}

/** Every test file that needs a session was independently retyping this
 * same shape with slightly different roles/permissions/tenants -- one
 * factory with sane defaults, override only what a given test actually
 * cares about. */
export function buildSession(overrides: BuildSessionOptions = {}): Session {
  const {
    id = "u1",
    name,
    email,
    roles = [],
    permissions = [],
    tenants = [],
    accessToken = "token",
    expires = "2099-01-01T00:00:00.000Z",
  } = overrides;

  return {
    user: { id, name, email, roles, permissions, tenants },
    accessToken,
    expires,
  } as Session;
}
