"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { UserPlus } from "lucide-react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { FormRenderer, type FormSchema } from "@/components/form";
import { TableRenderer, type TableSchema } from "@/components/table";
import { useApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import { can } from "@/lib/permissions";
import usersTableSchema from "@/schemas/tables/users-table.json";
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">
          {commonT("nav.users")}
        </h2>
        {can("users.invite", session) && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus />
            {t("actions.newUser")}
          </Button>
        )}
      </div>

      <TableRenderer<UserRow>
        key={tableKey}
        schema={usersTableSchema as unknown as TableSchema}
        actionHandlers={{
          editRoles: async (row) => setEditingUser(row as UserRow),
          resendInvite: async (row) => {
            const typedRow = row as UserRow;
            const res = await apiFetcher(
              `/users/${typedRow.id}/resend-invite`,
              { method: "POST" },
            );
            if (!res.ok) throw new Error(`Request failed with ${res.status}`);
          },
        }}
      />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("inviteDialog.title")}</DialogTitle>
          </DialogHeader>
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
                const res = await apiFetcher("/users", {
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
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser
                ? t("editRolesDialog.title", { name: editingUser.name })
                : ""}
            </DialogTitle>
          </DialogHeader>
          {editingUser && (
            <FormRenderer
              schema={editUserRolesFormSchema as unknown as FormSchema}
              defaultValues={{ role: editingUser.roles[0] }}
              onRefetch={refreshTable}
              actionHandlers={{
                saveRoles: async (values) => {
                  const { role } = values as { role: string };
                  const res = await apiFetcher(`/users/${editingUser.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ roles: [role] }),
                  });
                  if (!res.ok)
                    throw new Error(`Request failed with ${res.status}`);
                  setEditingUser(null);
                },
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
