"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { LogOut, PanelLeft, User as UserIcon } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { clearSessionCookiesAndSignOut } from "@/lib/auth/sign-out";
import { triggerToastFromConfig } from "@/lib/action-handlers";
import { EnvironmentSwitcher } from "../environment-switcher";
import { TenantSwitcher } from "../tenant-switcher";
import { useSidebar } from "../sidebar-provider";

export interface TopbarProps {
  /** Shown as the page/section title -- the (admin) layout passes the signed-in user's name here (plan §4.4). */
  title?: string;
}

export function Topbar({ title }: Readonly<TopbarProps>) {
  const { data: session } = useSession();
  const t = useTranslations("common");
  const { collapsed, toggle } = useSidebar();

  function handleSignOut() {
    triggerToastFromConfig(
      { toast: { messageKey: "topbar.signedOutToast" } },
      { translate: t },
    );
    clearSessionCookiesAndSignOut();
  }

  const initials = (session?.user.name ?? session?.user.email ?? "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-sticky flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-2">
        {/* Desktop only -- collapsing is a Sidebar (`hidden md:flex`)
         * concept; mobile uses BottomNav and never shows a Sidebar to shrink. */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden shrink-0 md:inline-flex"
          onClick={toggle}
          aria-label={t(collapsed ? "sidebar.expand" : "sidebar.collapse")}
        >
          <PanelLeft aria-hidden="true" />
        </Button>
        <h1 className="truncate text-sm font-semibold">
          {title ?? t("app.name")}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <EnvironmentSwitcher />
        <TenantSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-4 focus-visible:ring-ring/15">
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
