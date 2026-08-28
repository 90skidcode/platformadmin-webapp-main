import type { NextRequest } from "next/server";

import { forwardAuthRequest } from "../_shared/auth-forwarder";

/**
 * Public forwarder: POST /api/auth/update-password → backend POST /api/v1/auth/update-password.
 * No session or access token required -- this is a pre-login flow.
 * Backend expects: { email: string, new_password: string, confirm_password: string }
 * Password rules: 8–13 chars, uppercase + lowercase + digit + special character.
 */
export function POST(request: NextRequest) {
  return forwardAuthRequest(request, "/auth/update-password");
}
