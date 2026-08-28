import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Tests for all three public auth forwarder routes:
 *   POST /api/auth/generate-otp
 *   POST /api/auth/verify-otp
 *   POST /api/auth/update-password
 *
 * Each route is a thin proxy to the backend — the shared forwardAuthRequest
 * utility handles the actual forwarding, so these tests verify the end-to-end
 * behaviour from the perspective of the user and the UI calling them.
 */

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

vi.mock("@/lib/backend-client/environment-config.server", () => ({
  resolveBaseUrl: () => "https://backend/api/v1",
}));

function okResponse(body: object = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function errorResponse(status: number, code: string) {
  return new Response(JSON.stringify({ code, message: "Error", data: null }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function postTo(
  routeModule: { POST: (r: NextRequest) => unknown },
  url: string,
  body: object,
) {
  const request = new NextRequest(`https://localhost${url}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  return routeModule.POST(request) as Promise<Response>;
}

// ---------------------------------------------------------------------------
// generate-otp
// ---------------------------------------------------------------------------

describe("POST /api/auth/generate-otp", () => {
  beforeEach(() => vi.resetAllMocks());

  it("sends the OTP to the user and returns a success response when the email is registered", async () => {
    fetchMock.mockResolvedValue(okResponse({ code: "S_200_AUTH_OTP_SENT" }));
    const route = await import("../generate-otp/route");

    const response = await postTo(route, "/api/auth/generate-otp", {
      email: "admin@example.com",
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend/api/v1/auth/generate-otp",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns the backend's error response when the email is not registered", async () => {
    fetchMock.mockResolvedValue(errorResponse(400, "E_400_EMAIL_NOT_FOUND"));
    const route = await import("../generate-otp/route");

    const response = await postTo(route, "/api/auth/generate-otp", {
      email: "unknown@example.com",
    });

    expect(response.status).toBe(400);
  });

  it("returns 503 when the backend service is unavailable, so the user sees a meaningful error instead of a crash", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const route = await import("../generate-otp/route");

    const response = await postTo(route, "/api/auth/generate-otp", {
      email: "admin@example.com",
    });

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe("E_503_UPSTREAM_UNAVAILABLE");
  });

  it("forwards the request body to the backend unchanged so no data is lost in transit", async () => {
    fetchMock.mockResolvedValue(okResponse());
    const route = await import("../generate-otp/route");

    await postTo(route, "/api/auth/generate-otp", {
      email: "admin@example.com",
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ email: "admin@example.com" });
  });
});

// ---------------------------------------------------------------------------
// verify-otp
// ---------------------------------------------------------------------------

describe("POST /api/auth/verify-otp", () => {
  beforeEach(() => vi.resetAllMocks());

  it("confirms the OTP is valid and returns success so the user can proceed to reset their password", async () => {
    fetchMock.mockResolvedValue(
      okResponse({ code: "S_200_AUTH_OTP_VERIFIED" }),
    );
    const route = await import("../verify-otp/route");

    const response = await postTo(route, "/api/auth/verify-otp", {
      email: "admin@example.com",
      otp: "123456",
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend/api/v1/auth/verify-otp",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns the backend's error response when the OTP is incorrect or expired", async () => {
    fetchMock.mockResolvedValue(errorResponse(400, "E_400_INVALID_OTP"));
    const route = await import("../verify-otp/route");

    const response = await postTo(route, "/api/auth/verify-otp", {
      email: "admin@example.com",
      otp: "000000",
    });

    expect(response.status).toBe(400);
  });

  it("returns 503 when the backend service is unavailable, so the user sees a meaningful error instead of a crash", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const route = await import("../verify-otp/route");

    const response = await postTo(route, "/api/auth/verify-otp", {
      email: "admin@example.com",
      otp: "123456",
    });

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe("E_503_UPSTREAM_UNAVAILABLE");
  });

  it("forwards both the email and OTP to the backend unchanged so verification is accurate", async () => {
    fetchMock.mockResolvedValue(okResponse());
    const route = await import("../verify-otp/route");

    await postTo(route, "/api/auth/verify-otp", {
      email: "admin@example.com",
      otp: "123456",
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      email: "admin@example.com",
      otp: "123456",
    });
  });
});

// ---------------------------------------------------------------------------
// update-password
// ---------------------------------------------------------------------------

// Test credentials only — not a real secret.
const validCredentials = {
  email: "admin@example.com",
  new_pw: "Secure@123",
  confirm_new_pw: "Secure@123",
};
const validPasswordPayload = {
  email: validCredentials.email,
  new_password: validCredentials.new_pw,
  confirm_password: validCredentials.confirm_new_pw,
};

describe("POST /api/auth/update-password", () => {
  beforeEach(() => vi.resetAllMocks());

  it("updates the password and returns success so the user can log in with the new credentials", async () => {
    fetchMock.mockResolvedValue(okResponse({ code: "S_200_PASSWORD_UPDATED" }));
    const route = await import("../update-password/route");

    const response = await postTo(
      route,
      "/api/auth/update-password",
      validPasswordPayload,
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend/api/v1/auth/update-password",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns the backend's validation error when the password does not meet the complexity requirements", async () => {
    fetchMock.mockResolvedValue(errorResponse(422, "E_422_VALIDATION_FAILED"));
    const route = await import("../update-password/route");

    const response = await postTo(route, "/api/auth/update-password", {
      ...validPasswordPayload,
      // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- test input
      new_password: "weak",
      // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- test input
      confirm_password: "weak",
    });

    expect(response.status).toBe(422);
  });

  it("returns 503 when the backend service is unavailable, so the user sees a meaningful error instead of a crash", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const route = await import("../update-password/route");

    const response = await postTo(
      route,
      "/api/auth/update-password",
      validPasswordPayload,
    );

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe("E_503_UPSTREAM_UNAVAILABLE");
  });

  it("forwards the email and both password fields to the backend unchanged so the update is applied to the correct account", async () => {
    fetchMock.mockResolvedValue(okResponse());
    const route = await import("../update-password/route");

    await postTo(route, "/api/auth/update-password", validPasswordPayload);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual(validPasswordPayload);
  });
});
