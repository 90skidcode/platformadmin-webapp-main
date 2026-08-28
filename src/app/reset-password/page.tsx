"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  FieldHandlers,
  FormRenderer,
  type FormSchema,
} from "@/components/form";
import { toast } from "@/components/toast";
import { apiEndpoints } from "@/lib/api-endpoints";
import { pwresetSession } from "@/lib/auth/pwreset-session";
import resetPasswordFormSchema from "@/schemas/forms/reset-password-form.json";
import { UseFormReturn } from "react-hook-form";

export default function ResetPasswordPage() {
  const t = useTranslations("auth.resetPassword");
  const commonT = useTranslations("common");
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);

  // Mount guard: require BOTH session keys from earlier steps.
  useEffect(() => {
    const storedEmail = pwresetSession.getEmail();
    const verified = pwresetSession.isOtpVerified();
    if (!storedEmail || !verified) {
      router.replace("/forgot-password");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmail(storedEmail);
  }, [router]);

  const fieldHandlers: FieldHandlers = {
    checkPasswordMatch: (confirmValue, ctx) => {
      const { new_password } = ctx.getValues() as Record<string, string>;
      if (confirmValue && new_password && confirmValue !== new_password) {
        ctx.setFieldState("confirm_password", {
          error: "validation.passwordsDoNotMatch",
        });
      } else {
        // Clear error when they match
        ctx.setFieldState("confirm_password", {
          error: undefined,
        });
      }
    },
  };

  const actionHandlers = {
    resetPassword: async (
      values: unknown,
      ctx: { formApi?: UseFormReturn },
    ) => {
      const { new_password, confirm_password } = values as Record<
        string,
        string
      >;

      if (new_password !== confirm_password) {
        ctx.formApi?.setError("confirm_password", {
          type: "manual",
          message: "validation.passwordsDoNotMatch",
        });
        return;
      }

      const res = await fetch(apiEndpoints.auth.updatePassword, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, new_password, confirm_password }),
      });

      if (res.ok) {
        // Clear all password-reset session state.
        pwresetSession.clear();
        toast({ variant: "success", title: t("toast.success") });
        router.push("/login");
      } else {
        toast({ variant: "error", title: t("toast.error") });
      }
    },
  };

  // Don't render the form until the guard has resolved.
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
          <p className="mt-2 text-xs text-muted-foreground">
            {t("resetForEmail", { email })}
          </p>
          <p className="mt-2 mb-8 text-sm text-muted-foreground">
            {t("passwordRequirement")}
          </p>

          <FormRenderer
            schema={resetPasswordFormSchema as unknown as FormSchema}
            fieldHandlers={fieldHandlers}
            actionHandlers={actionHandlers}
          />
        </div>
      </div>
    </div>
  );
}
