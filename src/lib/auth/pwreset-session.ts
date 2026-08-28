const KEYS = {
  EMAIL: "pwreset_email",
  OTP_VERIFIED: "pwreset_otp_verified",
} as const;

/**
 * Utility helper for password recovery session state stored in sessionStorage.
 * Centralizes keys, SSR checks, reads, writes, and clearing.
 */
export const pwresetSession = {
  getEmail: (): string | null => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(KEYS.EMAIL);
  },
  setEmail: (email: string): void => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(KEYS.EMAIL, email);
  },
  isOtpVerified: (): boolean => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(KEYS.OTP_VERIFIED) === "true";
  },
  setOtpVerified: (): void => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(KEYS.OTP_VERIFIED, "true");
  },
  clear: (): void => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(KEYS.EMAIL);
    sessionStorage.removeItem(KEYS.OTP_VERIFIED);
  },
};
