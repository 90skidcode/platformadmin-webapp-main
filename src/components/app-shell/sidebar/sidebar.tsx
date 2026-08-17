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
 * equivalent, given the exact same `nav` so visibility can never diverge.
 * Solid `bg-primary` panel with pill-shaped nav items -- office-webapp's
 * sidebar treatment, ported to this app's own tokens rather than its
 * (much larger, bespoke) scale. */
export function Sidebar({ nav }: Readonly<SidebarProps>) {
  const pathname = usePathname();
  const t = useTranslations("common");

  return (
    <nav
      aria-label={t("nav.dashboard")}
      className="hidden w-60 shrink-0 flex-col gap-1 bg-primary p-3 md:flex"
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
              "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors",
              active
                ? "bg-primary-foreground/15 text-primary-foreground shadow-sm"
                : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground",
            )}
          >
            {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
            <span className="flex-1">{t(item.labelKey)}</span>
            {item.badge?.count ? (
              // "secondary", not "default" -- a bg-primary badge would be
              // invisible against this sidebar's own bg-primary background.
              <Badge
                variant={
                  item.badge.variant === "destructive"
                    ? "destructive"
                    : "secondary"
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
