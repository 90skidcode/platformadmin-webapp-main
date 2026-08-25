import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

export interface RenderWithProvidersOptions
  extends Omit<RenderOptions, "wrapper"> {
  /** Wraps in NextIntlClientProvider when given -- omit for a component that never reads intl context. */
  messages?: AbstractIntlMessages;
  locale?: string;
  /** Wraps in SessionProvider when given (including `null`, an explicitly-signed-out session) -- omit for a component that never reads session. */
  session?: Session | null;
  /** Any additional context providers this one test needs
   * (EnvironmentProvider, TenantProvider, ...) that don't belong in a
   * shared helper -- composed innermost, closest to `ui`. */
  wrap?: (children: ReactNode) => ReactNode;
}

/**
 * The one place every test file's NextIntlClientProvider/SessionProvider
 * wrapping lives, instead of each of the ~13 files that need one or both
 * hand-rolling the same JSX. Each provider is opt-in (only wraps if its
 * option is passed) since not every test needs both -- e.g.
 * form-actions.test.tsx needs a session but never reads intl context, and
 * bottom-nav.test.tsx is the reverse.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    messages,
    locale = "en",
    session,
    wrap,
    ...renderOptions
  }: RenderWithProvidersOptions = {},
) {
  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    let tree = wrap ? wrap(children) : children;
    if (session !== undefined) {
      tree = (
        <SessionProvider session={session ?? undefined}>{tree}</SessionProvider>
      );
    }
    if (messages !== undefined) {
      tree = (
        <NextIntlClientProvider locale={locale} messages={messages}>
          {tree}
        </NextIntlClientProvider>
      );
    }
    return <>{tree}</>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export * from "@testing-library/react";
