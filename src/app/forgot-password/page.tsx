"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { FormRenderer, type FormSchema } from "@/components/form";
import { toast } from "@/components/toast";
import { apiEndpoints } from "@/lib/api-endpoints";
import { pwresetSession } from "@/lib/auth/pwreset-session";
import forgotPasswordFormSchema from "@/schemas/forms/forgot-password-form.json";
import { ROUTES } from "@/constants/routes";
import { useEffect } from "react";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");
  const commonT = useTranslations("common");
  const router = useRouter();

  useEffect(() => {
    pwresetSession.clear();
  }, []);

  const actionHandlers = {
    sendOtp: async (values: unknown) => {
      const email = ((values as Record<string, string>).email ?? "").trim();

      const res = await fetch(apiEndpoints.auth.generateOtp, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        // Carry the email forward to /verify-otp (and later to /reset-password).
        pwresetSession.setEmail(email);
        router.push("/verify-otp");
      } else {
        toast({ variant: "error", title: t("toast.error") });
      }
    },
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Brand panel (hidden on mobile, matches login layout exactly) ── */}
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
            {t("title")}
          </h2>
          <p className="mt-4 max-w-sm text-sm text-primary-foreground/80">
            {t("subtitle")}
          </p>
        </div>

        <p className="relative text-xs text-primary-foreground/60">
          {"© "}
          {new Date().getFullYear()}
          {" Platform Admin. All rights reserved."}
        </p>
      </div>

      {/* ── Form panel ── */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          {/* App name shown on mobile only (brand panel is hidden on small screens) */}
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
            schema={forgotPasswordFormSchema as unknown as FormSchema}
            actionHandlers={actionHandlers}
          />

          <p className="mt-6 text-center text-sm">
            <Link
              href={ROUTES.LOGIN}
              className="text-primary underline-offset-4 hover:underline"
            >
              {t("links.backToLogin")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
