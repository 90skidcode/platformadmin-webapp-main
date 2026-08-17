"use client";

import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { LogOut, User as UserIcon } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { deleteCookie } from "@/lib/utils/cookies";
import { triggerToastFromConfig } from "@/lib/action-handlers";
import { EnvironmentSwitcher } from "../environment-switcher";
import { TenantSwitcher } from "../tenant-switcher";

export interface TopbarProps {
  /** Shown as the page/section title -- the (admin) layout passes the signed-in user's name here (plan §4.4). */
  title?: string;
}

export function Topbar({ title }: Readonly<TopbarProps>) {
  const { data: session } = useSession();
  const t = useTranslations("common");

  function handleSignOut() {
    // §5: signOut() also clears the environment/tenant cookies -- a fresh
    // sign-in shouldn't inherit the previous user's switcher state.
    deleteCookie("admin-environment");
    deleteCookie("admin-tenant");
    triggerToastFromConfig(
      { toast: { messageKey: "topbar.signedOutToast" } },
      { translate: t },
    );
    signOut({ callbackUrl: "/login" });
  }

  const initials = (session?.user.name ?? session?.user.email ?? "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4">
      <h1 className="truncate text-sm font-semibold">
        {title ?? t("app.name")}
      </h1>
      <div className="flex items-center gap-3">
        <EnvironmentSwitcher />
        <TenantSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="size-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="flex flex-col gap-1">
              <span>{t("topbar.myAccount")}</span>
              <span className="flex flex-wrap gap-1">
                {session?.user.roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserIcon />
              {t("topbar.profile")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
              <LogOut />
              {t("actions.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
