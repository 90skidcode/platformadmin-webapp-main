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
import { FormRenderer } from "@/components/form";
import { TableRenderer } from "@/components/table";
import { apiEndpoints } from "@/lib/api-endpoints";
import { useApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import { can } from "@/lib/permissions";
import { usersTableSchema } from "@/schemas/tables/users-table";
import { addUserFormSchema } from "@/schemas/forms/add-user-form";
import { toast } from "@/components/toast";
import { editUserFormSchema } from "@/schemas/forms/edit-user-form";

interface UserRow {
  [key: string]: unknown;
  id: string;
  name: string;
  status: string;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const apiFetcher = useApiFetcher();
  const t = useTranslations("tables.users");
  const commonT = useTranslations("common");
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
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
        }}
        toolbarEnd={
          can("users.invite", session) && (
            <Button onClick={() => setShowUserModal(true)}>
              <UserPlus />
              {t("actions.newUser")}
            </Button>
          )
        }
      />

      <Sheet
        open={!!showUserModal}
        onOpenChange={(open) => !open && setShowUserModal(false)}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t("newUsereDialog.title")}</SheetTitle>
          </SheetHeader>

          <FormRenderer
            schema={addUserFormSchema}
            defaultValues={{ name: "", email: "", password: "" }}
            onRefetch={refreshTable}
            actionHandlers={{
              addUser: async (values) => {
                const { name, email, password } = values as {
                  name: string;
                  email: string;
                  password: string;
                };
                const res = await apiFetcher(apiEndpoints.users.newUser(), {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name, email, password }),
                });
                if (!res.ok) {
                  // 1. Read custom message from API response
                  const errorData = await res.json().catch(() => null);
                  const errorMessage =
                    errorData?.message ||
                    `Request failed with status ${res.status}`;
                  // 2. Show the custom error toast
                  toast({
                    variant: "error",
                    title: "Error",
                    description: errorMessage,
                  });
                  // 3. Throw to prevent onSuccess from running
                  throw new Error(errorMessage);
                }
                setShowUserModal(false);
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
                ? t("editUserDialog.title", { name: editingUser.name })
                : ""}
            </SheetTitle>
          </SheetHeader>
          {editingUser && (
            <FormRenderer
              schema={editUserFormSchema}
              defaultValues={{
                name: editingUser.name,
                email: editingUser.email,
                status: editingUser.status,
              }}
              onRefetch={refreshTable}
              actionHandlers={{
                updateUser: async (values) => {
                  const { name, status, email } = values as {
                    name: string;
                    status: string;
                    email: string;
                  };
                  const res = await apiFetcher(
                    apiEndpoints.users.byId(editingUser.id),
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name, status, email }),
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
