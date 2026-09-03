"use client";

import { useMemo, useState } from "react";
import { Check, Copy, FileCode } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui";

export interface JsonViewerCellProps {
  row?: Record<string, unknown>;
  value?: unknown;
  title?: string;
  label?: string;
}

function formatDisplayValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") {
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

export function JsonViewerCell({
  row,
  value,
  title,
  label,
}: Readonly<JsonViewerCellProps>) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const commonT = useTranslations("common");

  const dataToDisplay = useMemo(
    () => (value ?? row ?? {}) as Record<string, unknown>,
    [value, row],
  );

  const jsonString = useMemo(() => {
    try {
      return JSON.stringify(dataToDisplay, null, 2);
    } catch {
      return String(dataToDisplay);
    }
  }, [dataToDisplay]);

  const entries = useMemo(() => {
    if (dataToDisplay && typeof dataToDisplay === "object") {
      return Object.entries(dataToDisplay);
    }
    return [];
  }, [dataToDisplay]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const buttonLabel = label ?? commonT("table.viewJson");
  const modalTitle = title ?? commonT("table.jsonDetails");

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 px-2.5 text-xs font-normal"
        onClick={() => setOpen(true)}
      >
        <FileCode
          className="size-3.5 text-muted-foreground"
          aria-hidden="true"
        />
        <span>{buttonLabel}</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-lg md:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-base font-semibold">
              <FileCode className="size-4 text-primary" aria-hidden="true" />
              <span>{modalTitle}</span>
            </SheetTitle>
            <SheetDescription className="text-xs">
              {commonT("table.jsonDetailsDescription")}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto pt-2">
            {entries.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {commonT("table.structuredView")}
                </span>
                <div className="divide-y divide-border rounded-md border border-border bg-card text-xs">
                  {entries.map(([k, v]) => {
                    const formatted = formatDisplayValue(v);
                    const isObj = typeof v === "object" && v !== null;
                    return (
                      <div
                        key={k}
                        className="flex flex-col gap-1 p-2.5 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <span className="font-mono font-medium text-muted-foreground sm:w-1/3">
                          {k}
                        </span>
                        <div className="sm:w-2/3 sm:text-right">
                          {isObj ? (
                            <pre className="max-h-32 overflow-auto rounded bg-muted/70 p-1.5 text-left font-mono text-xs text-foreground">
                              <code>{formatted}</code>
                            </pre>
                          ) : (
                            <span className="font-mono break-all text-foreground">
                              {formatted}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {commonT("table.rawJsonView")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check
                        className="size-3.5 text-success"
                        aria-hidden="true"
                      />
                      <span>{commonT("table.jsonCopied")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" aria-hidden="true" />
                      <span>{commonT("table.copyJson")}</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="relative max-h-80 overflow-auto rounded-lg border border-border bg-muted/60 p-3 font-mono text-xs leading-relaxed text-foreground select-text">
                <pre className="break-all whitespace-pre-wrap">
                  <code>{jsonString}</code>
                </pre>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
