// src/services/authService.ts
import { post } from './api-client';
import type { TriggerOtpInput, VerifyOtpInput, LoginResponse } from '@/schemas/auth-schema';
import { setCookie } from '@/lib/utils/cookies';
import { appConfig, apiConfig } from '@/config';

/**
 * OTP response interface
 */
export interface OtpResponse {
  success: boolean;
  message: string;
  expiresIn?: number;
}

/**
 * Trigger OTP for phone number
 * @param input - Phone number input
 * @returns OTP response
 */
export async function triggerOtp(input: TriggerOtpInput): Promise<OtpResponse> {
  try {
    const response = await post<OtpResponse>(apiConfig.endpoints.auth.triggerOtp, input);
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send OTP';
    throw new Error(message);
  }
}

/**
 * Resend OTP for phone number
 * @param input - Phone number input
 * @returns OTP response
 */
export async function resendOtp(input: TriggerOtpInput): Promise<OtpResponse> {
  try {
    const response = await post<OtpResponse>(apiConfig.endpoints.auth.resendOtp, input);
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to resend OTP';
    throw new Error(message);
  }
}

/**
 * Verify OTP and login
 * @param input - Phone and OTP input
 * @returns Login response with token and user data
 */
export async function verifyOtp(input: VerifyOtpInput): Promise<LoginResponse> {
  try {
    const response = await post<LoginResponse>(apiConfig.endpoints.auth.verifyOtp, input);

    // Save token to cookie
    if (response.token) {
      setCookie(appConfig.cookies.names.authToken, response.token, {
        days: appConfig.cookies.defaultExpiryDays,
      });
      setCookie(
        appConfig.cookies.names.userData,
        encodeURIComponent(JSON.stringify(response.user)),
        { days: appConfig.cookies.defaultExpiryDays }
      );
    }

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to verify OTP';
    throw new Error(message);
  }
}

/**
 * Logout user
 * Clears authentication cookies
 */
export async function logout(): Promise<void> {
  try {
    // Optionally call logout endpoint
    await post(apiConfig.endpoints.auth.logout);
  } catch (error) {
    // Continue with local logout even if API call fails
    console.error('Logout API call failed:', error);
  } finally {
    // Always clear local auth data
    const { deleteCookie } = await import('@/lib/utils/cookies');
    deleteCookie(appConfig.cookies.names.authToken);
    deleteCookie(appConfig.cookies.names.userData);
  }
}

/**
 * Get current auth token
 * @returns Auth token or null
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const { getCookie } = require('@/lib/utils/cookies');
  return getCookie(appConfig.cookies.names.authToken);
}

/**
 * Check if user is authenticated
 * @returns True if authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}
