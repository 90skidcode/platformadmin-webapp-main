import { z } from "zod";

// Phone number validation schema
export const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must not exceed 15 digits")
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone number format"),
});

// OTP trigger schema
export const triggerOtpSchema = z.object({
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must not exceed 15 digits")
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone number format"),
});

// OTP verification schema
export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must not exceed 15 digits"),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^[0-9]+$/, "OTP must contain only numbers"),
});

// Login response schema
export const loginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    phone: z.string(),
    name: z.string().optional(),
    email: z.string().email().optional(),
  }),
});

// Type exports
export type PhoneInput = z.infer<typeof phoneSchema>;
export type TriggerOtpInput = z.infer<typeof triggerOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
