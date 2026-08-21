"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { ELLIPSIS, getPageNumbers } from "./get-page-numbers";

export interface TablePaginationProps {
  pageIndex: number;
  pageSize: number;
  total: number;
  disabled?: boolean;
  onPageChange: (index: number) => void;
}

export function TablePagination({
  pageIndex,
  pageSize,
  total,
  disabled = false,
  onPageChange,
}: Readonly<TablePaginationProps>) {
  const t = useTranslations("common");
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = pageIndex + 1;
  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-2">
      <span className="text-sm text-muted-foreground">
        {t("table.page", { page: currentPage, totalPages })}
      </span>
      <nav
        aria-label={t("table.pagination")}
        className="flex items-center gap-1"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || pageIndex === 0}
          onClick={() => onPageChange(pageIndex - 1)}
        >
          {t("table.previousPage")}
        </Button>
        {pages.map((page, i) =>
          page === ELLIPSIS ? (
            <span
              // Never two ellipses in a row, so the page number right after
              // this one is a stable, unique key -- no array index needed.
              key={`ellipsis-${pages[i + 1]}`}
              className="px-2 text-sm text-muted-foreground select-none"
            >
              <span aria-hidden="true">…</span>
              <span className="sr-only">{t("table.morePages")}</span>
            </span>
          ) : (
            <Button
              key={page}
              type="button"
              variant={page === currentPage ? "primary" : "outline"}
              size="sm"
              disabled={disabled}
              className={cn(
                "min-w-8 px-2",
                page === currentPage && "pointer-events-none",
              )}
              aria-label={t("table.goToPage", { page })}
              aria-current={page === currentPage ? "page" : undefined}
              onClick={() => onPageChange(page - 1)}
            >
              {page}
            </Button>
          ),
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || pageIndex + 1 >= totalPages}
          onClick={() => onPageChange(pageIndex + 1)}
        >
          {t("table.nextPage")}
        </Button>
      </nav>
    </div>
  );
}
