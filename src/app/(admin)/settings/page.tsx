"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { FormRenderer, type FormSchema } from "@/components/form";
import { useApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import settingsFormSchema from "@/schemas/forms/settings-form.json";

interface SettingsData {
  [key: string]: unknown;
  orgName: string;
  defaultEnvironment: string;
  sessionTimeoutMinutes: number;
  notifyOnLogin: boolean;
  notifyOnRoleChange: boolean;
}

export default function SettingsPage() {
  const apiFetcher = useApiFetcher();
  const commonT = useTranslations("common");
  const formsT = useTranslations("forms.settings");
  const [settings, setSettings] = useState<SettingsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetcher("/settings")
      .then((res) => res.json())
      .then((data: SettingsData) => {
        if (!cancelled) setSettings(data);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount; apiFetcher's identity is stable (useCallback with no deps).
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h2 className="text-xl font-semibold tracking-tight">
        {commonT("nav.settings")}
      </h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{formsT("sectionTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {settings ? (
            <FormRenderer
              schema={settingsFormSchema as unknown as FormSchema}
              defaultValues={settings}
              apiFetcher={apiFetcher}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {commonT("loading")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
