"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils/cn";
import { ICON_REGISTRY } from "@/lib/icons/icon-registry";
import type { NavItem } from "../nav-items";

export interface BottomNavProps {
  /** Already filtered via `filterNavByAccess` (plan §5) -- same list Sidebar gets. */
  nav: NavItem[];
}

/** Mobile-only (see `md:hidden` below); Sidebar is the desktop equivalent,
 * given the exact same `nav` so visibility can never diverge. Flattens --
 * `children` is a desktop-sidebar-only concept, ignored here. */
export function BottomNav({ nav }: Readonly<BottomNavProps>) {
  const pathname = usePathname();
  const t = useTranslations("common");

  return (
    <nav
      aria-label={t("nav.dashboard")}
      className="fixed inset-x-0 bottom-0 z-sticky flex items-center justify-around border-t border-border bg-card py-1 md:hidden"
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
              "flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 text-xs font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            {Icon && <Icon className="size-5" aria-hidden="true" />}
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
