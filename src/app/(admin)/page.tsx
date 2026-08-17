import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth/auth";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { NAV_ITEMS } from "@/components/app-shell";
import { filterNavByAccess } from "@/lib/permissions";

export default async function DashboardPage() {
  const session = await auth();
  const t = await getTranslations("common");
  const links = filterNavByAccess(NAV_ITEMS, session).filter(
    (item) => item.id !== "dashboard",
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("dashboard.welcome", {
            name: session?.user.name ?? session?.user.email ?? "",
          })}
        </h2>
        <p className="text-muted-foreground">
          {t("dashboard.subtitle", {
            tenant: session?.user.tenants[0]?.name ?? "",
          })}
        </p>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          {t("dashboard.quickLinks")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {links.map((item) => (
            <Link key={item.id} href={item.href}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader>
                  <CardTitle>{t(item.labelKey)}</CardTitle>
                  <CardDescription>{item.href}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
