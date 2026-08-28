import type { NextRequest } from "next/server";

import { forwardAuthRequest } from "../_shared/auth-forwarder";

/**
 * Public forwarder: POST /api/auth/verify-otp → backend POST /api/v1/auth/verify-otp.
 * No session or access token required -- this is a pre-login flow.
 * Backend expects: { email: string, otp: string }
 */
export function POST(request: NextRequest) {
  return forwardAuthRequest(request, "/auth/verify-otp");
}
