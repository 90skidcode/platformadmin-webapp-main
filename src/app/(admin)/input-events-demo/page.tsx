"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import {
  FormRenderer,
  type FieldHandlers,
  type FormSchema,
} from "@/components/form";
import inputEventsDemoFormSchema from "@/schemas/forms/input-events-demo-form.json";

interface EventLogEntry {
  id: number;
  time: string;
  field: string;
  type: string;
  detail?: string;
}

const MAX_LOG_ENTRIES = 40;
let nextLogId = 0;

/**
 * Demo page for the JSON-driven form engine (components/form): the fields
 * come entirely from input-events-demo-form.json and render through
 * `FormRenderer`, same as `users/page.tsx`'s invite/edit forms -- no
 * hand-written `<Input>` JSX here.
 *
 * Two engine features exist only to make this demo possible:
 * - `onFieldEvent` (FormRenderer prop): every field's raw DOM events
 *   (click, keyup, focus, ...) stream into the log below -- see
 *   `text-field.tsx`. The schema itself can't carry that wiring, since
 *   JSON has no function values.
 * - `onKeyUp` (a field's schema entry): a `fieldHandlers` registry key,
 *   same registry-by-name shape as an action's `onClick` resolving against
 *   `actionHandlers`. Field A's names `checkFieldAAvailability` below, an
 *   ordinary async function -- it debounces, calls the real (mock) Users
 *   API, and once that resolves imperatively disables Field B / sets an
 *   error on Field C via `ctx.setFieldState`. When Field A is available, it
 *   also prefills Field B's value as a suggestion -- `FieldState.value`
 *   routes through react-hook-form's own `setValue`, so it's a real edit,
 *   not a second copy of the value. Not `form.watch`-driven: it runs once
 *   per keyup, not once per render, and it's free to be async. See
 *   `FieldHandler`/`FieldState` in components/form/types.ts.
 */
export default function InputEventsDemoPage() {
  const t = useTranslations("forms.inputEventsDemo");
  const [log, setLog] = useState<EventLogEntry[]>([]);

  const logFieldEvent = (field: string, type: string, detail?: string) => {
    const entry: EventLogEntry = {
      id: nextLogId++,
      time: new Date().toLocaleTimeString(),
      field,
      type,
      detail,
    };
    setLog((prev) => [entry, ...prev].slice(0, MAX_LOG_ENTRIES));
  };

  const fieldHandlers: FieldHandlers = {
    checkFieldAAvailability: (value, ctx) => {
      ctx.setFieldState("fieldB", {
        disabled: true,
        // Available -- suggest it as Field B's value too (left alone,
        // `undefined`, when there's a match instead).
        value: value ? undefined : "hi, fieldA is empty",
      });
      ctx.setFieldState("fieldC", {
        error: true ? t("fields.fieldC.dependencyError") : undefined,
      });
    },
    // Not wired to any field yet -- add `"onKeyUp": "customErrorHandler"`
    // to a field in input-events-demo-form.json to see it fire. Shows a
    // handler can target its own field, not just another one: `ctx` doesn't
    // distinguish "self" from "other", it's just a name.
    customErrorHandler: (_value, ctx) => {
      ctx.setFieldState("fieldG", { error: "Custom error triggered!" });
    },
    handleDateFieldChange: (value, ctx) => {
      ctx.setFieldState("fieldB", {
        value: value ? `Selected Date: ${value}` : undefined,
      });
    },
    handleDateRangeFieldChange: (value, ctx) => {
      if (value) {
        ctx.setFieldState("fieldG", {
          error: t("fields.fieldI.rangeDependencyError"),
        });
      } else {
        ctx.setFieldState("fieldG", {
          error: undefined,
        });
      }
    },
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Input events demo
        </h2>
        <p className="text-sm text-muted-foreground">
          Fields below render through{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            FormRenderer
          </code>{" "}
          from{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            input-events-demo-form.json
          </code>
          . Every native input event streams into the log on the right; typing
          into Field A calls the Users API on keyup (debounced) -- once it
          resolves, a match disables Field B and errors Field C, and no match
          instead copies the typed value into Field B as a suggestion.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fields</CardTitle>
            <CardDescription>
              JSON-driven, cross-field reactive.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormRenderer
              schema={inputEventsDemoFormSchema as FormSchema}
              onFieldEvent={logFieldEvent}
              fieldHandlers={fieldHandlers}
              actionHandlers={{
                logValues: (values) => {
                  logFieldEvent("form", "submit", JSON.stringify(values));
                },
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event log</CardTitle>
            <CardDescription>
              Every event fired above, newest first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs">
              {log.length === 0 ? (
                <p className="text-muted-foreground">
                  No events yet -- click, focus, or type into a field.
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {log.map((entry) => (
                    <li key={entry.id}>
                      <span className="text-muted-foreground">
                        {entry.time}
                      </span>{" "}
                      <span className="font-semibold text-foreground">
                        {entry.field}
                      </span>{" "}
                      <span className="text-primary">{entry.type}</span>
                      {entry.detail ? (
                        <span className="text-muted-foreground">
                          {" "}
                          — {entry.detail}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setLog([])}
            >
              Clear log
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
