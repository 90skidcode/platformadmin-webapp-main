/**
 * API Endpoints Configuration
 * Centralized endpoint definitions for all API calls throughout the application.
 * This file serves as a single source of truth for all API paths.
 *
 * Usage:
 *   import { API_ENDPOINTS } from '@/constants/apiendpoints';
 *   const endpoint = API_ENDPOINTS.AUTH.TRIGGER_OTP; // Returns "/auth/trigger-otp"
 */

/**
 * API Endpoints namespace
 * Organized by feature/resource for easy navigation and maintenance
 */
export const API_ENDPOINTS = {
  /**
   * Authentication endpoints
   * Handles OTP-based authentication and user session management
   */
  AUTH: {
    TRIGGER_OTP: '/auth/trigger-otp',
    RESEND_OTP: '/auth/resend-otp',
    VERIFY_OTP: '/auth/verify-otp',
    LOGOUT: '/auth/logout',
  },

  /**
   * User endpoints
   * Manages user profile and user-specific data
   */
  USER: {
    PROFILE: '/user/profile',
    BY_ID: (userId: string) => `/user/${userId}`,
  },

  /**
   * Employees endpoints
   * Manages employee data and operations
   */
  EMPLOYEES: {
    LIST: '/employees',
    CREATE: '/employees',
    BY_ID: (employeeId: string) => `/employees/${employeeId}`,
    UPDATE: (employeeId: string) => `/employees/${employeeId}`,
    DELETE: (employeeId: string) => `/employees/${employeeId}`,
  },

  /**
   * Users management endpoints
   * Manages users in the system
   */
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    BY_ID: (userId: string) => `/users/${userId}`,
    UPDATE: (userId: string) => `/users/${userId}`,
    DELETE: (userId: string) => `/users/${userId}`,
  },

  /**
   * Audit log endpoints
   * Tracks all system activities and changes
   */
  AUDIT_LOG: {
    LIST: '/audit-log',
  },

  /**
   * Settings endpoints
   * Manages application and user settings
   */
  SETTINGS: {
    GET: '/settings',
    UPDATE: '/settings',
  },

  /**
   * Current user info endpoint
   * Retrieves information about the currently authenticated user
   */
  ME: {
    GET: '/me',
  },

  /**
   * Tasks endpoints
   * Manages task data and operations
   */
  TASKS: {
    LIST: '/todos',
    BY_ID: (taskId: string | number) => `/todos/${taskId}`,
    DETAIL: '/todos',
  },
} as const;

/**
 * API Endpoints type for type safety
 * Use this type when you need to reference an endpoint path
 */
export type ApiEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS][keyof typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS]];

/**
 * Helper function to build dynamic endpoints
 * Useful for complex endpoint construction with multiple parameters
 *
 * @example
 *   const endpoint = buildEndpoint('/users/{userId}/posts/{postId}', { userId: '123', postId: '456' });
 *   // Returns: '/users/123/posts/456'
 */
export function buildEndpoint(
  template: string,
  params: Record<string, string | number>
): string {
  return template.replace(/{(\w+)}/g, (_, key) => String(params[key]));
}

/**
 * Utility type for extracting endpoint string values
 * Filters out function types from the endpoints object
 */
export type EndpointPaths = {
  [K in keyof typeof API_ENDPOINTS]: {
    [P in keyof (typeof API_ENDPOINTS)[K]]: (typeof API_ENDPOINTS)[K][P] extends string
      ? (typeof API_ENDPOINTS)[K][P]
      : never;
  }[keyof (typeof API_ENDPOINTS)[K]];
}[keyof typeof API_ENDPOINTS];
