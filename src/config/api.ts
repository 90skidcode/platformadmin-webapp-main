// src/config/api.ts

/**
 * API configuration
 * Centralized API settings including base URL, timeouts, and endpoints
 */
export const apiConfig = {
  /**
   * Base URL for API requests
   * Defaults to localhost:8000 for development
   */
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",

  /**
   * Request timeout in milliseconds
   */
  timeout: 30000,

  /**
   * API endpoint paths
   */
  endpoints: {
    auth: {
      triggerOtp: "/auth/trigger-otp",
      resendOtp: "/auth/resend-otp",
      verifyOtp: "/auth/verify-otp",
      logout: "/auth/logout",
    },
    user: {
      profile: "/user/profile",
      byId: (userId: string) => `/user/${userId}`,
    },
  },

  /**
   * Default headers for API requests
   */
  headers: {
    "Content-Type": "application/json",
  },
} as const;
