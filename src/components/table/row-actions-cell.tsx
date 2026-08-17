"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui";
import { triggerToastFromConfig } from "@/lib/action-handlers";
import { ICON_REGISTRY } from "@/lib/icons/icon-registry";
import { can } from "@/lib/permissions";
import type { ApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import { resolveText } from "../form/fields/field-label";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { interpolateRow } from "./interpolate-row";
import type { ActionHandlers, RowAction } from "./types";

export interface RowActionsCellProps {
  actions: RowAction[];
  row: Record<string, unknown>;
  actionHandlers: ActionHandlers;
  apiFetcher: ApiFetcher;
  translate: (key: string) => string;
  refetch: () => void;
}

/**
 * Plan §7.2: `navigate` pushes a route, `api` calls `endpoint` through the
 * BFF proxy, `custom` calls the consumer's `actionHandlers[onClick]` -- all
 * three go through the same `confirm` (AlertDialog) and `permission` (`can()`)
 * gates, the same shape FormActions uses (plan §9).
 */
export function RowActionsCell({
  actions,
  row,
  actionHandlers,
  apiFetcher,
  translate,
  refetch,
}: Readonly<RowActionsCellProps>) {
  const { data: session } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState<RowAction | null>(null);

  const visible = actions.filter(
    (action) => !action.permission || can(action.permission, session),
  );
  if (visible.length === 0) return null;

  async function run(action: RowAction) {
    try {
      if (action.handler === "navigate") {
        router.push(interpolateRow(action.target ?? "", row));
        return;
      }
      if (action.handler === "api" && action.endpoint) {
        const res = await apiFetcher(interpolateRow(action.endpoint.url, row), {
          method: action.endpoint.method,
          ...(action.endpoint.body && {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action.endpoint.body),
          }),
        });
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);
      } else if (action.handler === "custom" && action.onClick) {
        await actionHandlers[action.onClick]?.(row, { row });
      }
      triggerToastFromConfig(action.onSuccess, { translate, router, refetch });
    } catch {
      triggerToastFromConfig(action.onError, { translate, router, refetch });
    }
  }

  function handleClick(action: RowAction) {
    if (action.confirm) {
      setPending(action);
      return;
    }
    void run(action);
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {visible.map((action) => {
        const Icon = action.icon ? ICON_REGISTRY[action.icon] : undefined;
        const label =
          resolveText(translate, action.label, action.labelKey) ?? action.id;
        return (
          <Button
            key={action.id}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            onClick={() => handleClick(action)}
          >
            {Icon ? <Icon aria-hidden="true" /> : label}
          </Button>
        );
      })}

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
