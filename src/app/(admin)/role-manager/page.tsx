"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui";
import { TableRenderer } from "@/components/table";
import {
  defaultRolesData,
  rolesTableSchema,
  type RoleItem,
} from "@/schemas/tables/roles-table";

export default function RoleManagerPage() {
  const commonT = useTranslations("common");
  const t = useTranslations("tables.roles");

  const [roles, setRoles] = useState<RoleItem[]>(defaultRolesData);

  const handleDeleteRole = async (row: unknown) => {
    const typedRow = row as RoleItem;
    setRoles((prev) => prev.filter((r) => r.id !== typedRow.id));
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
        data={roles}
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
