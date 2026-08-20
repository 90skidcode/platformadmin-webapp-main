"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Globe } from "lucide-react";

import {
  Badge,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui";
import { FormRenderer, type FormSchema } from "@/components/form";
import { TableRenderer, type TableSchema } from "@/components/table";
import { useApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import { toast } from "@/components/toast";
import backendUsersTableSchema from "@/schemas/tables/backend-users-table.json";
import editBackendUserFormSchema from "@/schemas/forms/edit-backend-user-form.json";

interface BackendUser {
  [key: string]: unknown;
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export default function BackendUsersPage() {
  const commonT = useTranslations("common");
  const t = useTranslations("tables.backendUsers");
  const apiFetcher = useApiFetcher();

  const [editingUser, setEditingUser] = useState<BackendUser | null>(null);
  const [tableKey, setTableKey] = useState(0);
  const refreshTable = () => setTableKey((k) => k + 1);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight">
            {commonT("nav.backendUsers")}
          </h2>
          <Badge variant="outline" className="gap-1 text-xs">
            <Globe className="size-3" />
            FastAPI Live
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Live user management loaded directly via the authenticated session
          from the FastAPI backend.
        </p>
      </div>

      <TableRenderer<BackendUser>
        key={tableKey}
        schema={backendUsersTableSchema as unknown as TableSchema}
        actionHandlers={{
          editUser: async (row) => {
            setEditingUser(row as BackendUser);
          },
        }}
      />

      {/* Edit User Sheet */}
      <Sheet
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingUser
                ? t("editDialog.title", { name: editingUser.name })
                : ""}
            </SheetTitle>
          </SheetHeader>

          {editingUser && (
            <FormRenderer
              schema={editBackendUserFormSchema as unknown as FormSchema}
              defaultValues={{
                name: editingUser.name,
                email: editingUser.email,
                status: editingUser.status,
              }}
              onRefetch={refreshTable}
              actionHandlers={{
                saveUser: async (values) => {
                  const payload = values as {
                    name?: string;
                    email?: string;
                    status?: string;
                  };
                  try {
                    const userId =
                      editingUser.id || editingUser.user_id || editingUser._id;

                    const res = await apiFetcher(`/users/${userId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });

                    if (!res.ok) {
                      const errData = await res.json().catch(() => ({}));
                      const errorMsg =
                        errData.message ||
                        `Update failed with status ${res.status}`;
                      throw new Error(errorMsg);
                    }

                    toast({
                      variant: "success",
                      title: t("toast.updated"),
                    });
                    setEditingUser(null);
                    refreshTable();
                  } catch (err: unknown) {
                    toast({
                      variant: "error",
                      title: (err as Error)?.message || t("toast.genericError"),
                    });
                  }
                },
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
