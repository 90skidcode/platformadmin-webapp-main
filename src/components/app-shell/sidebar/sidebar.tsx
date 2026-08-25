"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { ICON_REGISTRY } from "@/lib/icons/icon-registry";
import { Logo } from "../logo";
import { useSidebar } from "../sidebar-provider";
import type { NavItem } from "../nav-items";

export interface SidebarProps {
  /** Already filtered via `filterNavByAccess` (plan §5) -- Sidebar just renders. */
  nav: NavItem[];
}

/** Desktop-only (see `hidden md:flex` below); BottomNav is the mobile
 * equivalent, given the exact same `nav` so visibility can never diverge.
 * Solid `bg-primary` panel with pill-shaped nav items -- office-webapp's
 * sidebar treatment, ported to this app's own tokens rather than its
 * (much larger, bespoke) scale.
 *
 * Collapsed state (mini logo, icon-only rail) comes from SidebarProvider,
 * toggled by the button Topbar renders -- both read the same context so
 * they can never disagree on which state is showing. */
export function Sidebar({ nav }: Readonly<SidebarProps>) {
  const pathname = usePathname();
  const t = useTranslations("common");
  const { collapsed } = useSidebar();

  return (
    <nav
      aria-label={t("nav.dashboard")}
      className={cn(
        // duration-[...] stays arbitrary-value syntax, same as Button --
        // see button.tsx's note: Tailwind v4's duration-* utility doesn't
        // read named theme entries the way ease-*/w-* do.
        // eslint-disable-next-line tailwindcss/no-arbitrary-value
        "hidden shrink-0 flex-col gap-1 bg-primary p-3 transition-all duration-[var(--duration-base)] ease-standard md:flex",
        collapsed ? "w-20" : "w-60",
      )}
    >
      <div className="mb-2 flex h-9 items-center px-1.5">
        <Logo collapsed={collapsed} />
      </div>
      {nav.map((item) => {
        const Icon = ICON_REGISTRY[item.icon];
        const active = pathname === item.href;
        const link = (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            aria-label={collapsed ? t(item.labelKey) : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors",
              collapsed && "justify-center px-0",
              active
                ? "bg-primary-foreground/15 text-primary-foreground shadow-sm"
                : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground",
            )}
          >
            {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
            {!collapsed && <span className="flex-1">{t(item.labelKey)}</span>}
            {!collapsed && item.badge?.count ? (
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

        if (!collapsed) return link;

        // Collapsed rail has no room for a label -- a tooltip is the only
        // way to still surface it (aria-label above covers screen readers).
        return (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent>{t(item.labelKey)}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
