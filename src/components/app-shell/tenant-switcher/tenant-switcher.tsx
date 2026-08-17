"use client";

import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { useTenant } from "@/lib/tenant";

/** Renders nothing for a single-tenant session -- no point switching
 * between one option. */
export function TenantSwitcher() {
  const { active, tenants, setActive } = useTenant();
  const t = useTranslations("common");

  if (tenants.length <= 1 || !active) return null;

  return (
    <Select value={active.id} onValueChange={setActive}>
      <SelectTrigger aria-label={t("topbar.tenant")} className="h-9 w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {tenants.map((tenant) => (
          <SelectItem key={tenant.id} value={tenant.id}>
            {tenant.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
