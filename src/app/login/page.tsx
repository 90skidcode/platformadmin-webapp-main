"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { FormRenderer, type FormSchema } from "@/components/form";
import { toast } from "@/components/toast";
import loginFormSchema from "@/schemas/forms/login-form.json";

/**
 * The login form is just another `FormRenderer` instance -- the natural
 * first place to exercise the `type: "button"` + `onClick` action (plan
 * §4.5). `proxy.ts`'s optimistic redirect (§4.4) sends unauthenticated
 * visits here with `?from=<original path>`.
 */
export default function LoginPage() {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
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
          <p className="text-center text-xs text-muted-foreground">
            {t("demoAccounts")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
