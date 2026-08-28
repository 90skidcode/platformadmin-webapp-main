"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { FormRenderer, type FormSchema } from "@/components/form";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui";
import { apiEndpoints } from "@/lib/api-endpoints";
import { pwresetSession } from "@/lib/auth/pwreset-session";
import verifyOtpFormSchema from "@/schemas/forms/verify-otp-form.json";
import { ROUTES } from "@/constants/routes";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyOtpPage() {
  const t = useTranslations("auth.verifyOtp");
  const commonT = useTranslations("common");
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Mount guard: must have an email from /forgot-password.
  useEffect(() => {
    const stored = pwresetSession.getEmail();
    if (!stored) {
      router.replace("/forgot-password");
      return;
    }
    setEmail(stored);
  }, [router]);

  // Cooldown countdown -- decrements once per second until it reaches 0.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timerId = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timerId);
  }, [cooldown]);

  async function handleResend() {
    if (!email || isResending || cooldown > 0) return;
    setIsResending(true);
    try {
      const res = await fetch(apiEndpoints.auth.generateOtp, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        toast({ variant: "success", title: t("toast.resendSuccess") });
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        toast({ variant: "error", title: t("toast.resendError") });
      }
    } finally {
      setIsResending(false);
    }
  }

  const actionHandlers = {
    verifyOtp: async (values: unknown) => {
      const otp = ((values as Record<string, string>).otp ?? "").trim();

      const res = await fetch(apiEndpoints.auth.verifyOtp, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      if (res.ok) {
        pwresetSession.setOtpVerified();
        router.push("/reset-password");
      } else {
        toast({ variant: "error", title: t("toast.verifyError") });
      }
    },
  };

  // Don't render the form until the guard has resolved -- avoids a flash of
  // content that would then immediately redirect away.
  if (!email) return null;

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Brand panel (matches login/page.tsx exactly) ── */}
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
          <p className="mb-2 text-sm font-semibold tracking-widest text-muted-foreground uppercase lg:hidden">
            {commonT("app.name")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
          <p className="mt-1 mb-8 text-xs text-muted-foreground">
            {t("otpSentTo", { email })}
          </p>

          <FormRenderer
            schema={verifyOtpFormSchema as unknown as FormSchema}
            actionHandlers={actionHandlers}
          />

          {/* Resend OTP -- outside FormRenderer since it submits no field values */}
          <div className="mt-4 flex justify-center">
            <Button
              id="resend-otp-button"
              variant="ghost"
              size="sm"
              type="button"
              disabled={isResending || cooldown > 0}
              loading={isResending}
              onClick={handleResend}
            >
              {cooldown > 0
                ? t("resendCooldown", { seconds: cooldown })
                : t("actions.resendOtp")}
            </Button>
          </div>

          <p className="mt-4 text-center text-sm">
            <Link
              href={ROUTES.FORGOT_PASSWORD}
              className="text-primary underline-offset-4 hover:underline"
            >
              {t("links.backToForgotPassword")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
