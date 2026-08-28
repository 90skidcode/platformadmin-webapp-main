"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui";
import { TableRenderer } from "@/components/table";
import { apiEndpoints } from "@/lib/api-endpoints";
import { parseApiErrorMessage } from "@/lib/api-envelope";
import { useApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import { rolesTableSchema, type RoleItem } from "@/schemas/tables/roles-table";

export default function RoleManagerPage() {
  const commonT = useTranslations("common");
  const t = useTranslations("tables.roles");
  const apiFetcher = useApiFetcher();

  const handleDeleteRole = async (row: unknown) => {
    const typedRow = row as RoleItem;
    const res = await apiFetcher(apiEndpoints.roles.byId(typedRow.id), {
      method: "DELETE",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(parseApiErrorMessage(body, res.status));
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          {commonT("nav.roleManager")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* Schema-Driven Table */}
      <TableRenderer<RoleItem>
        schema={rolesTableSchema}
        actionHandlers={{
          deleteRole: handleDeleteRole,
        }}
        toolbarEnd={
          <Link href="/role-manager/new">
            <Button className="gap-1.5">
              <Plus className="size-4" />
              {t("actions.newRole")}
            </Button>
          </Link>
        }
      />
    </div>
  );
}
