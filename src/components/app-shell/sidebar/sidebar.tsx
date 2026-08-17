"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { ICON_REGISTRY } from "@/lib/icons/icon-registry";
import type { NavItem } from "../nav-items";

export interface SidebarProps {
  /** Already filtered via `filterNavByAccess` (plan §5) -- Sidebar just renders. */
  nav: NavItem[];
}

/** Desktop-only (see `hidden md:flex` below); BottomNav is the mobile
 * equivalent, given the exact same `nav` so visibility can never diverge. */
export function Sidebar({ nav }: Readonly<SidebarProps>) {
  const pathname = usePathname();
  const t = useTranslations("common");

  return (
    <nav
      aria-label={t("nav.dashboard")}
      className="hidden w-56 shrink-0 flex-col gap-1 border-r border-border bg-card p-3 md:flex"
    >
      {nav.map((item) => {
        const Icon = ICON_REGISTRY[item.icon];
        const active = pathname === item.href;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
            <span className="flex-1">{t(item.labelKey)}</span>
            {item.badge?.count ? (
              <Badge
                variant={
                  item.badge.variant === "destructive"
                    ? "destructive"
                    : "default"
                }
              >
                {item.badge.count}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
