// src/lib/utils/api.ts

/**
 * Status callback type for API operations
 */
export type StatusCallback = (status: string) => void;

/**
 * API response type
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * Trigger OTP for phone number
 * @param phone - Phone number to send OTP to
 * @param onStatus - Optional callback for status updates
 */
export async function triggerOtp(
  phone: string,
  onStatus?: StatusCallback,
): Promise<ApiResponse> {
  try {
    onStatus?.("started");

    // Simulate API request to send OTP
    onStatus?.("sending_otp");
    await new Promise((r) => setTimeout(r, 2000));

    // OTP sent successfully
    onStatus?.("otp_sent");

    return { success: true, message: "OTP sent!" };
  } catch {
    onStatus?.("error");
    return { success: false, message: "Failed to send OTP" };
  }
}

/**
 * Create a delay promise
 * @param ms - Milliseconds to delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Handle API errors consistently
 * @param error - Error object
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}
