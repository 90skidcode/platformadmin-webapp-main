"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui";
import { triggerToastFromConfig } from "@/lib/action-handlers";
import {
  type ApiEnvelope,
  type ApiFieldError,
  isErrorEnvelope,
} from "@/lib/api-envelope";
import { can } from "@/lib/permissions";
import type { ApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import type { ActionHandlers, FormAction, FormSchema } from "../types";
import { resolveText } from "../fields/field-label";

export interface FormActionsProps {
  schema: FormSchema;
  form: UseFormReturn<FieldValues>;
  actionHandlers: ActionHandlers;
  apiFetcher: ApiFetcher;
  translate: (key: string) => string;
  /** Backs `onSuccess.refetch`/`onError.refetch` -- e.g. a form embedded in a
   * dialog next to a table it should refresh once submitted (plan §6.4's
   * `refetch` concept isn't table-only). */
  onRefetch?: () => void;
}

/** API-Standards-Guide.md §3: on `E_422_VALIDATION_FAILED`, `data.errors`
 * carries `{ field, issue }` pairs -- surface each as a field-level RHF
 * error so the form highlights exactly what failed, instead of only the
 * generic `onError` toast. Best-effort: a non-JSON or differently-shaped
 * error body just falls through to that toast, same as before. */
async function applyServerFieldErrors(
  res: Response,
  form: UseFormReturn<FieldValues>,
) {
  const body = (await res.json().catch(() => null)) as ApiEnvelope<{
    errors?: ApiFieldError[];
  }> | null;
  if (!body || !isErrorEnvelope(body.code)) return;
  for (const { field, issue } of body.data?.errors ?? []) {
    form.setError(field as never, { type: "server", message: issue });
  }
}

/**
 * Plan §7.1's semantics table, made literal:
 * - submit: validates, then either POSTs to `endpoint` or (if `onClick` is
 *   set) calls the handler instead -- the default POST is skipped entirely.
 * - reset: `form.reset()`, then also calls `onClick` if set.
 * - link: renders as `<Link>`; `onClick` fires before navigating.
 * - button: no default behavior; `onClick` runs immediately, NOT gated by
 *   validation (right for "Preview"/"Save draft").
 */
export function FormActions({
  schema,
  form,
  actionHandlers,
  apiFetcher,
  translate,
  onRefetch,
}: Readonly<FormActionsProps>) {
  const { data: session } = useSession();
  const router = useRouter();

  const visibleActions = schema.actions.filter(
    (action) => !action.permission || can(action.permission, session),
  );

  async function runResult(
    action: FormAction,
    succeeded: boolean,
    error?: unknown,
  ) {
    const fallbackMessage =
      !succeeded &&
      error instanceof Error &&
      error.message &&
      !error.message.startsWith("Request failed with ")
        ? error.message
        : undefined;

    triggerToastFromConfig(succeeded ? action.onSuccess : action.onError, {
      translate,
      router,
      refetch: onRefetch,
      fallbackMessage,
    });
  }

  async function handleSubmit(action: FormAction) {
    await form.handleSubmit(async (values) => {
      try {
        if (action.onClick) {
          await actionHandlers[action.onClick]?.(values, { formApi: form });
        } else if (action.endpoint) {
          const res = await apiFetcher(action.endpoint.url, {
            method: action.endpoint.method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          });
          if (!res.ok) {
            await applyServerFieldErrors(res, form);
            throw new Error(`Request failed with ${res.status}`);
          }
        }
        await runResult(action, true);
      } catch (err) {
        await runResult(action, false, err);
      }
    })();
  }

  function handleReset(action: FormAction) {
    form.reset();
    if (action.onClick)
      actionHandlers[action.onClick]?.(form.getValues(), { formApi: form });
  }

  async function handleButton(action: FormAction) {
    if (!action.onClick) return;
    try {
      await actionHandlers[action.onClick]?.(form.getValues(), {
        formApi: form,
      });
      await runResult(action, true);
    } catch {
      await runResult(action, false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visibleActions.map((action) => {
        const label =
          resolveText(translate, action.label, action.labelKey) ?? action.id;

        if (action.type === "link") {
          return (
            <Button
              key={action.id}
              asChild
              variant={action.variant ?? "outline"}
            >
              <Link
                href={action.href ?? "#"}
                onClick={() =>
                  actionHandlers[action.onClick ?? ""]?.(form.getValues(), {
                    formApi: form,
                  })
                }
              >
                {label}
              </Link>
            </Button>
          );
        }

        if (action.type === "reset") {
          return (
            <Button
              key={action.id}
              type="button"
              variant={action.variant ?? "ghost"}
              onClick={() => handleReset(action)}
            >
              {label}
            </Button>
          );
        }

        if (action.type === "button") {
          return (
            <Button
              key={action.id}
              type="button"
              variant={action.variant ?? "outline"}
              onClick={() => handleButton(action)}
            >
              {label}
            </Button>
          );
        }

        return (
          <Button
            key={action.id}
            type="button"
            variant={action.variant ?? "primary"}
            loading={form.formState.isSubmitting}
            onClick={() => handleSubmit(action)}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
