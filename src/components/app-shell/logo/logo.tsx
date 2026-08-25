import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils/cn";

export interface LogoProps {
  /** Mark only, no wordmark -- what the collapsed Sidebar renders. */
  collapsed?: boolean;
  className?: string;
}

/** The app's brand mark (initials tile) plus, when expanded, its wordmark
 * (`app.name`). One component renders both Sidebar states so the mark
 * itself -- size, radius, colors -- never drifts between them. */
export function Logo({ collapsed = false, className }: Readonly<LogoProps>) {
  const t = useTranslations("common");

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15 text-sm font-bold text-primary-foreground"
      >
        PA
      </span>
      {!collapsed && (
        <span className="truncate text-sm font-semibold text-primary-foreground">
          {t("app.name")}
        </span>
      )}
    </div>
  );
}
