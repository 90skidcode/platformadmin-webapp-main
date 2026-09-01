"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { toast } from "@/components/toast";
import { Button, OtpInput } from "@/components/ui";
import { apiEndpoints } from "@/lib/api-endpoints";
import { pwresetSession } from "@/lib/auth/pwreset-session";
import { ROUTES } from "@/constants/routes";

const RESEND_COOLDOWN_SECONDS = 60;
const OTP_LENGTH = 5;

export default function VerifyOtpPage() {
  const t = useTranslations("auth.verifyOtp");
  const commonT = useTranslations("common");
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Mount guard: must have an email from /forgot-password.
  useEffect(() => {
    const stored = pwresetSession.getEmail();
    if (!stored) {
      router.replace(ROUTES.FORGOT_PASSWORD);
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

  async function executeVerify(otpToVerify: string) {
    const cleanOtp = otpToVerify.trim();
    if (cleanOtp.length !== OTP_LENGTH || !email || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(apiEndpoints.auth.verifyOtp, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: cleanOtp }),
      });

      if (res.ok) {
        pwresetSession.setOtpVerified();
        router.push(ROUTES.RESET_PASSWORD);
      } else {
        toast({ variant: "error", title: t("toast.verifyError") });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    executeVerify(otp);
  }

  if (!email) return null;

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

          <form onSubmit={handleSubmit}>
            <div className="my-6">
              <OtpInput
                id="verify-otp-input"
                length={OTP_LENGTH}
                value={otp}
                onChange={setOtp}
                onComplete={executeVerify}
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <Button
              id="verify-otp-submit-button"
              type="submit"
              variant="primary"
              className="w-full"
              disabled={otp.length !== OTP_LENGTH || isSubmitting}
              loading={isSubmitting}
            >
              {t("actions.verifyOtp")}
            </Button>
          </form>

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
