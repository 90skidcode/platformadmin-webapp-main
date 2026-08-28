import type { NextRequest } from "next/server";

import { forwardAuthRequest } from "../_shared/auth-forwarder";

/**
 * Public forwarder: POST /api/auth/generate-otp → backend POST /api/v1/auth/generate-otp.
 * No session or access token required -- this is a pre-login flow.
 */
export function POST(request: NextRequest) {
  return forwardAuthRequest(request, "/auth/generate-otp");
}
