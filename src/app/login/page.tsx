"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { FormRenderer, type FormSchema } from "@/components/form";
import { toast } from "@/components/toast";
import loginFormSchema from "@/schemas/forms/login-form.json";

/**
 * Split-screen auth layout (brand panel + form panel), matching the
 * office-webapp sign-in page's composition -- adapted to this app's own
 * design tokens rather than office's, and with zero inline `style` props:
 * every value here is a Tailwind utility resolving to a token already
 * registered in tokens.css's `@theme inline` block (`bg-primary`,
 * `text-primary-foreground`, opacity-modified variants of both, ...), same
 * constraint `eslint-plugin-tailwindcss`'s `no-arbitrary-value` already
 * enforces everywhere else in this codebase.
 *
 * The login form itself is still just another `FormRenderer` instance --
 * the natural first place to exercise the `type: "button"` + `onClick`
 * action (plan §4.5). `proxy.ts`'s optimistic redirect (§4.4) sends
 * unauthenticated visits here with `?from=<original path>`.
 */
export default function LoginPage() {
  const t = useTranslations("auth.login");
  const commonT = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden w-2/5 flex-col justify-between overflow-hidden bg-primary px-12 py-16 text-primary-foreground lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-primary-foreground/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-16 size-80 rounded-full bg-primary-foreground/5"
        />

        <div className="relative">
          <span className="text-sm font-semibold tracking-widest text-primary-foreground/70 uppercase">
            {commonT("app.name")}
          </span>
          <h2 className="mt-6 max-w-sm text-3xl font-semibold tracking-tight">
            {t("brand.heading")}
          </h2>
          <p className="mt-4 max-w-sm text-sm text-primary-foreground/80">
            {t("brand.description")}
          </p>
        </div>

        <p className="relative text-xs text-primary-foreground/60">
          {t("brand.copyright", { year: new Date().getFullYear() })}
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <p className="mb-2 text-sm font-semibold tracking-widest text-muted-foreground uppercase lg:hidden">
            {commonT("app.name")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 mb-8 text-sm text-muted-foreground">
            {t("subtitle")}
          </p>

          <FormRenderer
            schema={loginFormSchema as unknown as FormSchema}
            actionHandlers={{
              signInWithCredentials: async (values) => {
                const result = await signIn("credentials", {
                  ...(values as Record<string, string>),
                  redirect: false,
                });
                if (result?.error) {
                  toast({
                    variant: "error",
                    title: t("errors.invalidCredentials"),
                  });
                } else {
                  router.push(searchParams.get("from") ?? "/");
                }
              },
            }}
          />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t("demoAccounts")}
          </p>
        </div>
      </div>
    </div>
  );
}
