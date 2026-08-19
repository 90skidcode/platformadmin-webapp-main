"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { UserPlus } from "lucide-react";

import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui";
import { FormRenderer, type FormSchema } from "@/components/form";
import { TableRenderer } from "@/components/table";
import { apiEndpoints } from "@/lib/api-endpoints";
import { useApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import { can } from "@/lib/permissions";
import { usersTableSchema } from "@/schemas/tables/users-table";
import inviteUserFormSchema from "@/schemas/forms/invite-user-form.json";
import editUserRolesFormSchema from "@/schemas/forms/edit-user-roles-form.json";

interface UserRow {
  [key: string]: unknown;
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: string;
}

// Edit convention: never a centered popup. invite-user-form.json (3 fields)
// and edit-user-roles-form.json (1 field) both open in a Sheet (right-side
// panel); a form with 5+ fields gets a full page instead -- see
// settings-form.ts / src/app/(admin)/settings/page.tsx for that case.
export default function UsersPage() {
  const { data: session } = useSession();
  const apiFetcher = useApiFetcher();
  const t = useTranslations("tables.users");
  const commonT = useTranslations("common");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [tableKey, setTableKey] = useState(0);
  const refreshTable = () => setTableKey((k) => k + 1);

  return (
    <div className="flex flex-col gap-4 p-6">
      <h2 className="text-xl font-semibold tracking-tight">
        {commonT("nav.users")}
      </h2>

      <TableRenderer<UserRow>
        key={tableKey}
        schema={usersTableSchema}
        actionHandlers={{
          editRoles: async (row) => setEditingUser(row as UserRow),
          resendInvite: async (row) => {
            const typedRow = row as UserRow;
            const res = await apiFetcher(
              apiEndpoints.users.resendInvite(typedRow.id),
              { method: "POST" },
            );
            if (!res.ok) throw new Error(`Request failed with ${res.status}`);
          },
        }}
        toolbarEnd={
          can("users.invite", session) && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus />
              {t("actions.newUser")}
            </Button>
          )
        }
      />

      <Sheet open={inviteOpen} onOpenChange={setInviteOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t("inviteDialog.title")}</SheetTitle>
          </SheetHeader>
          <FormRenderer
            schema={inviteUserFormSchema as unknown as FormSchema}
            onRefetch={refreshTable}
            actionHandlers={{
              inviteUser: async (values) => {
                const { role, ...rest } = values as {
                  role: string;
                  name: string;
                  email: string;
                };
                const res = await apiFetcher(apiEndpoints.users.list, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...rest, roles: [role] }),
                });
                if (!res.ok)
                  throw new Error(`Request failed with ${res.status}`);
                setInviteOpen(false);
              },
            }}
          />
        </SheetContent>
      </Sheet>

      <Sheet
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingUser
                ? t("editRolesDialog.title", { name: editingUser.name })
                : ""}
            </SheetTitle>
          </SheetHeader>
          {editingUser && (
            <FormRenderer
              schema={editUserRolesFormSchema as unknown as FormSchema}
              defaultValues={{
                name: editingUser.name,
                email: editingUser.email,
                role: editingUser.roles[0],
              }}
              onRefetch={refreshTable}
              actionHandlers={{
                saveRoles: async (values) => {
                  const { role, ...rest } = values as {
                    role: string;
                    name: string;
                    email: string;
                  };
                  const res = await apiFetcher(
                    apiEndpoints.users.byId(editingUser.id),
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ...rest, roles: [role] }),
                    },
                  );
                  if (!res.ok)
                    throw new Error(`Request failed with ${res.status}`);
                  setEditingUser(null);
                },
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
