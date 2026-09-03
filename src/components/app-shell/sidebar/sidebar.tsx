"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight } from "lucide-react";

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

interface SidebarNavLinkProps {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  t: (key: string) => string;
}

function SidebarNavLink({
  item,
  collapsed,
  active,
  t,
}: Readonly<SidebarNavLinkProps>) {
  const Icon = ICON_REGISTRY[item.icon];
  const targetHref = item.children?.length ? item.children[0].href : item.href;

  const link = (
    <Link
      href={targetHref}
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
        <Badge
          variant={
            item.badge.variant === "destructive" ? "destructive" : "secondary"
          }
        >
          {item.badge.count}
        </Badge>
      ) : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent>{t(item.labelKey)}</TooltipContent>
    </Tooltip>
  );
}

interface SidebarNavGroupProps {
  item: NavItem;
  isOpen: boolean;
  isChildActive: boolean;
  onToggle: () => void;
  pathname: string;
  t: (key: string) => string;
}

function SidebarNavGroup({
  item,
  isOpen,
  isChildActive,
  onToggle,
  pathname,
  t,
}: Readonly<SidebarNavGroupProps>) {
  const Icon = ICON_REGISTRY[item.icon];

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium transition-colors",
          isChildActive
            ? "font-semibold text-primary-foreground"
            : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground",
        )}
      >
        {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
        <span className="flex-1">{t(item.labelKey)}</span>
        {isOpen ? (
          <ChevronDown className="size-4 shrink-0 opacity-70" />
        ) : (
          <ChevronRight className="size-4 shrink-0 opacity-70" />
        )}
      </button>

      {isOpen && (
        <div className="ml-4 flex flex-col gap-1 border-l border-primary-foreground/20 pl-2">
          {item.children?.map((child) => {
            const ChildIcon = ICON_REGISTRY[child.icon];
            const active = pathname === child.href;
            return (
              <Link
                key={child.id}
                href={child.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary-foreground/20 font-semibold text-primary-foreground shadow-xs"
                    : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground",
                )}
              >
                {ChildIcon && (
                  <ChildIcon className="size-3.5 shrink-0" aria-hidden="true" />
                )}
                <span className="truncate">{t(child.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
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
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  // Auto-expand any submenu whose child is active
  useEffect(() => {
    nav.forEach((item) => {
      if (
        item.children?.some(
          (child) => pathname === child.href || pathname.startsWith(child.href),
        )
      ) {
        setOpenSubmenus((prev) => ({ ...prev, [item.id]: true }));
      }
    });
  }, [pathname, nav]);

  const toggleSubmenu = (id: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <nav
      aria-label={t("nav.dashboard")}
      className={cn(
        // duration-[...] stays arbitrary-value syntax, same as Button --
        // see button.tsx's note: Tailwind v4's duration-* utility doesn't
        // read named theme entries the way ease-*/w-* do.
        // eslint-disable-next-line tailwindcss/no-arbitrary-value
        "hidden shrink-0 flex-col gap-1 overflow-y-auto bg-primary p-3 transition-all duration-[var(--duration-base)] ease-standard md:flex",
        collapsed ? "w-20" : "w-60",
      )}
    >
      <div className="mb-2 flex h-9 items-center px-1.5">
        <Logo collapsed={collapsed} />
      </div>
      {nav.map((item) => {
        const hasChildren = !!item.children && item.children.length > 0;
        const isChildActive =
          hasChildren &&
          item.children!.some(
            (child) =>
              pathname === child.href || pathname.startsWith(child.href),
          );

        if (hasChildren && !collapsed) {
          return (
            <SidebarNavGroup
              key={item.id}
              item={item}
              isOpen={openSubmenus[item.id] ?? isChildActive}
              isChildActive={isChildActive}
              onToggle={() => toggleSubmenu(item.id)}
              pathname={pathname}
              t={t}
            />
          );
        }

        const active = pathname === item.href || isChildActive;
        return (
          <SidebarNavLink
            key={item.id}
            item={item}
            collapsed={collapsed}
            active={active}
            t={t}
          />
        );
      })}
    </nav>
  );
}
