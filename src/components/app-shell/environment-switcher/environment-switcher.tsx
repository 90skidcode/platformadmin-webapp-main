"use client";

import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { useEnvironment } from "@/lib/environment";

export function EnvironmentSwitcher() {
  const { active, environments, setActive } = useEnvironment();
  const t = useTranslations("common");

  return (
    <Select value={active.id} onValueChange={setActive}>
      <SelectTrigger aria-label={t("topbar.environment")} className="h-9 w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {environments.map((env) => (
          <SelectItem key={env.id} value={env.id}>
            {t(env.labelKey)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
