import type { Metadata } from "next";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Toaster } from "@/components/toast";
import { isRtlLocale } from "@/i18n/request";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Platform Admin",
  description: "Enterprise JSON-driven admin platform.",
};

// Resolves OS color-scheme preference into the `.dark` class before first
// paint, so `.dark` in tokens.css is the single source of truth for dark
// values (no separate `@media (prefers-color-scheme: dark)` CSS block
// duplicating the same declarations). Runs synchronously, before hydration,
// so there's no flash of the wrong theme. A future explicit light/dark
// toggle would extend this script to check its own stored preference first,
// same as the `.light`/`.dark` classes it already sets are named for.
const THEME_SCRIPT = `(function(){try{if(window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // proxy.ts (§16.1) generates this fresh per request and forwards it as a
  // request header; the inline theme script below reads it from here.
  // Next's own framework scripts self-nonce from the same request header
  // without any extra wiring.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} dir={isRtlLocale(locale) ? "rtl" : "ltr"}>
      <body className="font-sans antialiased" data-csp-nonce={nonce}>
        {/* Static, non-interpolated string (no user input); needed pre-hydration and CSP forbids unsafe-inline, so this is the only way to run it this early. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
