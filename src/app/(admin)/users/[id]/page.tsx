"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { Button, Skeleton } from "@/components/ui";
import { FormRenderer, type FormSchema } from "@/components/form";
import { apiEndpoints } from "@/lib/api-endpoints";
import { parseApiErrorMessage } from "@/lib/api-envelope";
import { useApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import editUserFormSchema from "@/schemas/forms/edit-user-form.json";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export default function EditUserPage({
  params,
}: {
  params?: { id: string };
} = {}) {
  const routeParams = useParams();
  const userId = params?.id ?? (routeParams?.id as string) ?? "";

  const t = useTranslations("tables.users");
  const apiFetcher = useApiFetcher();
  const router = useRouter();

  const [user, setUser] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const res = await apiFetcher(apiEndpoints.users.byId(userId));
        if (cancelled) return;
        if (!res.ok) {
          setError(`Failed to load user (${res.status})`);
          setLoading(false);
          return;
        }
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        const data = (json?.data ?? json) as UserRecord;
        setUser(data);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Network error loading user");
          setLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, [apiFetcher, userId]);

  return (
    <div className="flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/users" aria-label={t("actions.cancel")}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h2 className="text-xl font-semibold tracking-tight">
          {user
            ? t("editRolesDialog.title", { name: user.name })
            : t("actions.edit")}
        </h2>
      </div>

      {loading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-destructive/50 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {user && !loading && (
        <FormRenderer
          schema={editUserFormSchema as unknown as FormSchema}
          defaultValues={{
            name: user.name,
            email: user.email,
            status: user.status,
          }}
          actionHandlers={{
            saveUser: async (values) => {
              const res = await apiFetcher(apiEndpoints.users.byId(userId), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
              });
              if (!res.ok) {
                const body = await res.json().catch(() => null);
                throw new Error(parseApiErrorMessage(body, res.status));
              }
              router.push("/users");
            },
          }}
        />
      )}
    </div>
  );
}
