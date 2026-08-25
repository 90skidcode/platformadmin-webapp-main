"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui";
import { triggerToastFromConfig } from "@/lib/action-handlers";
import { can } from "@/lib/permissions";
import type { ApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import { resolveText } from "../form/fields/field-label";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { interpolateRow } from "./interpolate-row";
import type { ActionHandlers, BulkAction } from "./types";

export interface BulkActionsBarProps {
  actions: BulkAction[];
  selectedRows: Record<string, unknown>[];
  actionHandlers: ActionHandlers;
  apiFetcher: ApiFetcher;
  translate: (key: string) => string;
  refetch: () => void;
  onDone: () => void;
}

/** Operates on every selected row -- `api` calls `endpoint` once per row
 * (through the BFF proxy), `custom` hands the whole selection to one
 * `actionHandlers[onClick]` call. */
export function BulkActionsBar({
  actions,
  selectedRows,
  actionHandlers,
  apiFetcher,
  translate,
  refetch,
  onDone,
}: Readonly<BulkActionsBarProps>) {
  const { data: session } = useSession();
  const router = useRouter();
  const commonT = useTranslations("common");
  const [pending, setPending] = useState<BulkAction | null>(null);

  if (selectedRows.length === 0) return null;
  const visible = actions.filter(
    (action) => !action.permission || can(action.permission, session),
  );

  async function run(action: BulkAction) {
    try {
      if (action.handler === "api" && action.endpoint) {
        const endpoint = action.endpoint;
        await Promise.all(
          selectedRows.map((row) =>
            apiFetcher(interpolateRow(endpoint.url, row), {
              method: endpoint.method,
              ...(endpoint.body && {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(endpoint.body),
              }),
            }),
          ),
        );
      } else if (action.handler === "custom" && action.onClick) {
        await actionHandlers[action.onClick]?.(selectedRows, {});
      }
      triggerToastFromConfig(action.onSuccess, { translate, router, refetch });
      onDone();
    } catch {
      triggerToastFromConfig(action.onError, { translate, router, refetch });
    }
  }

  function handleClick(action: BulkAction) {
    if (action.confirm) {
      setPending(action);
      return;
    }
    void run(action);
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-muted px-3 py-2">
      <span className="text-sm font-medium">
        {commonT("table.selectedCount", { count: selectedRows.length })}
      </span>
      <div className="flex items-center gap-2">
        {visible.map((action) => (
          <Button
            key={action.id}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleClick(action)}
          >
            {resolveText(translate, action.label, action.labelKey) ?? action.id}
          </Button>
        ))}
      </div>

      <ConfirmActionDialog
        pending={pending}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) void run(pending);
          setPending(null);
        }}
        translate={translate}
      />
    </div>
  );
}
