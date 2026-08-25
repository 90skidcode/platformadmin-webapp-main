// src/config/i18n.ts

/**
 * Internationalization (i18n) configuration
 * Centralized locale settings and supported languages
 */
export const i18nConfig = {
  /**
   * List of supported locales.
   * 'ar' added for RTL shell coverage (enterprise-ui-system-plan.md §7,
   * exit criteria: "Second locale (one RTL) fully functional"). 'ta' is
   * legacy from before this plan and has no messages under the new
   * `src/messages/{locale}/*.json` namespaced structure yet.
   */
  supportedLocales: ["en", "ar", "ta"] as const,

  /**
   * Default locale for the application
   */
  defaultLocale: "en" as const,

  /**
   * Enable automatic locale detection based on browser settings
   */
  localeDetection: true,
} as const;

/**
 * Type helper for supported locale values
 */
export type SupportedLocale = (typeof i18nConfig.supportedLocales)[number];
