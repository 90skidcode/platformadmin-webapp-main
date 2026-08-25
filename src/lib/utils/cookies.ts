// src/lib/utils/cookies.ts

/**
 * Cookie options interface
 */
export interface CookieOptions {
  days?: number;
  path?: string;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

/**
 * Set a cookie (client-side only)
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 */
export function setCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): void {
  const { days = 7, path = "/", secure = true, sameSite = "Lax" } = options;

  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = `; expires=${date.toUTCString()}`;
  }

  const secureFlag = secure ? "; Secure" : "";
  const sameSiteFlag = `; SameSite=${sameSite}`;

  document.cookie = `${name}=${value || ""}${expires}; path=${path}${secureFlag}${sameSiteFlag}`;
}

/**
 * Get a cookie value (client-side only)
 * @param name - Cookie name
 * @returns Cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  if (match) return match[2];
  return null;
}

/**
 * Delete a cookie (client-side only)
 * @param name - Cookie name
 * @param path - Cookie path
 */
export function deleteCookie(name: string, path: string = "/"): void {
  setCookie(name, "", { days: -1, path });
}

/**
 * Check if a cookie exists (client-side only)
 * @param name - Cookie name
 * @returns True if cookie exists
 */
export function hasCookie(name: string): boolean {
  return getCookie(name) !== null;
}
