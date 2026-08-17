import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { i18nConfig, type SupportedLocale } from "@/config";

const RTL_LOCALES = new Set<SupportedLocale>(["ar"]);

/**
 * Cookie-based locale resolution, not URL-segment routing (`/[locale]/...`)
 * -- the plan's own folder tree (§2) never shows a `[locale]` segment, and
 * every admin route already sits under `app/(admin)/`; adding a locale
 * segment on top would mean restructuring every route this build already
 * created. `NEXT_LOCALE` is set by the language switcher (topbar).
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale: SupportedLocale = isSupportedLocale(cookieLocale)
    ? cookieLocale
    : i18nConfig.defaultLocale;

  const [common, auth, forms, tables] = await Promise.all([
    import(`../messages/${locale}/common.json`).catch(() => ({ default: {} })),
    import(`../messages/${locale}/auth.json`).catch(() => ({ default: {} })),
    import(`../messages/${locale}/forms.json`).catch(() => ({ default: {} })),
    import(`../messages/${locale}/tables.json`).catch(() => ({ default: {} })),
  ]);

  return {
    locale,
    messages: {
      common: common.default,
      auth: auth.default,
      forms: forms.default,
      tables: tables.default,
    },
  };
});

export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.has(locale as SupportedLocale);
}

function isSupportedLocale(
  value: string | undefined,
): value is SupportedLocale {
  return (
    !!value &&
    (i18nConfig.supportedLocales as readonly string[]).includes(value)
  );
}
