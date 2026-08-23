"use client";

import { useTranslations } from "next-intl";

import { FormRenderer, type FormSchema } from "@/components/form";
import { toast } from "@/components/toast";
import onboardingFormSchema from "@/schemas/forms/onboarding-form.json";

export default function LoginPage() {
  const t = useTranslations("forms.onboarding");
  const commonT = useTranslations("common");

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
            {t("description")}
          </p>
        </div>

        <p className="relative text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Platform Admin
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-lg">
          <p className="mb-2 text-sm font-semibold tracking-widest text-muted-foreground uppercase lg:hidden">
            {commonT("app.name")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 mb-8 text-sm text-muted-foreground">
            {t("description")}
          </p>

          <FormRenderer
            schema={onboardingFormSchema as unknown as FormSchema}
            actionHandlers={{
              onCountryChange: async (values) => {
                console.log("[event:onChange] Country selected:", values);
              },
              onStateChange: async (values) => {
                console.log("[event:onChange] State selected:", values);
              },
              onNotificationsChange: async (values) => {
                console.log(
                  "[event:onChange] Notifications toggle changed:",
                  values,
                );
              },
              submitOnboarding: async (values) => {
                await new Promise((resolve) => setTimeout(resolve, 400));
                console.log("[testing-form] Final values submitted:", values);
                toast({
                  variant: "success",
                  title: t("toast.submitted"),
                });
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
