// src/config/app.ts

/**
 * Application-wide configuration
 * General app settings, feature flags, and constants
 */
export const appConfig = {
  /**
   * Application name
   */
  name: "Kyber AI",

  /**
   * Cookie settings
   */
  cookies: {
    /**
     * Default cookie expiry in days
     */
    defaultExpiryDays: 7,

    /**
     * Cookie names used in the application
     */
    names: {
      authToken: "auth_token",
      userData: "user_data",
    },
  },

  /**
   * Feature flags
   * Enable/disable features based on environment or configuration
   */
  features: {
    /**
     * Enable analytics tracking
     */
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",

    /**
     * Enable dark mode support
     */
    enableDarkMode: true,
  },

  /**
   * Pagination settings
   */
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
} as const;
