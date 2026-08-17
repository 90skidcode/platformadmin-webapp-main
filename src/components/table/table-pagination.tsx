"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui";

export interface TablePaginationProps {
  pageIndex: number;
  pageSize: number;
  total: number;
  onPageChange: (index: number) => void;
}

export function TablePagination({
  pageIndex,
  pageSize,
  total,
  onPageChange,
}: Readonly<TablePaginationProps>) {
  const t = useTranslations("common");
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-2">
      <span className="text-sm text-muted-foreground">
        {t("table.page", { page: pageIndex + 1, totalPages })}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pageIndex === 0}
          onClick={() => onPageChange(pageIndex - 1)}
        >
          Prev
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pageIndex + 1 >= totalPages}
          onClick={() => onPageChange(pageIndex + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
