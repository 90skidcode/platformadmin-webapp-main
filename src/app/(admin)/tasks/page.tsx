"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Monitor, Plus, Server } from "lucide-react";

import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui";
import { FormRenderer, type FormSchema } from "@/components/form";
import { TableRenderer, type TableSchema } from "@/components/table";
import { toast } from "@/components/toast";
import { apiEndpoints } from "@/lib/api-endpoints";
import { useApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import tasksTableSchema from "@/schemas/tables/tasks-table.json";
import createTaskFormSchema from "@/schemas/forms/create-task-form.json";
import editTaskFormSchema from "@/schemas/forms/edit-task-form.json";

export interface TaskRow extends Record<string, unknown> {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
}

export default function TasksPage() {
  const apiFetcher = useApiFetcher();
  const t = useTranslations("tables.tasks");
  const commonT = useTranslations("common");

  const [mode, setMode] = useState<"client" | "server">(
    (tasksTableSchema.mode as "client" | "server") || "client",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [tableKey, setTableKey] = useState(0);

  const refreshTable = () => setTableKey((k) => k + 1);

  const currentSchema = useMemo<TableSchema>(
    () =>
      ({
        ...tasksTableSchema,
        mode,
      }) as unknown as TableSchema,
    [mode],
  );

  const toggleMode = () => {
    const nextMode = mode === "client" ? "server" : "client";
    setMode(nextMode);
    toast({
      variant: "info",
      title: `Switched to ${nextMode.toUpperCase()} mode`,
      description:
        nextMode === "server"
          ? "Search, sorting, and pagination will now query the server."
          : "Search, sorting, and pagination will now run in-memory on the client.",
    });
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight">
            {commonT("nav.tasks")}
          </h2>
          <Badge variant={mode === "server" ? "default" : "outline"}>
            {mode === "server" ? "Server Mode" : "Client Mode"}
          </Badge>
        </div>
      </div>

      <TableRenderer<TaskRow>
        key={`${mode}-${tableKey}`}
        schema={currentSchema}
        actionHandlers={{
          editTask: async (row) => setEditingTask(row as TaskRow),
          deleteTask: async (row) => {
            const task = row as TaskRow;
            const res = await apiFetcher(apiEndpoints.tasks.byId(task.id), {
              method: "DELETE",
            });
            if (!res.ok) throw new Error(`Request failed with ${res.status}`);
            refreshTable();
            toast({
              variant: "success",
              title: t("toast.deleted"),
            });
          },
        }}
        toolbarEnd={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleMode}
              className="gap-1.5"
            >
              {mode === "server" ? (
                <>
                  <Server className="size-4 text-primary" />
                  <span>Switch to Client</span>
                </>
              ) : (
                <>
                  <Monitor className="size-4 text-muted-foreground" />
                  <span>Switch to Server</span>
                </>
              )}
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              {t("actions.newTask")}
            </Button>
          </div>
        }
      />

      {/* Create Task Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t("dialog.newTitle")}</SheetTitle>
          </SheetHeader>
          <FormRenderer
            schema={createTaskFormSchema as unknown as FormSchema}
            onRefetch={refreshTable}
            actionHandlers={{
              createTask: async (values) => {
                const formValues = values as {
                  title?: string;
                  userId?: string | number;
                  completed?: boolean;
                };
                const res = await apiFetcher(apiEndpoints.tasks.list, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: String(formValues.title || ""),
                    userId: Number(formValues.userId) || 1,
                    completed: Boolean(formValues.completed),
                  }),
                });
                if (!res.ok)
                  throw new Error(`Request failed with ${res.status}`);
                setCreateOpen(false);
                refreshTable();
                toast({
                  variant: "success",
                  title: t("toast.created"),
                });
              },
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Edit Task Sheet */}
      <Sheet
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingTask ? t("dialog.editTitle", { id: editingTask.id }) : ""}
            </SheetTitle>
          </SheetHeader>
          {editingTask && (
            <FormRenderer
              schema={editTaskFormSchema as unknown as FormSchema}
              defaultValues={{
                title: editingTask.title,
                completed: editingTask.completed,
              }}
              onRefetch={refreshTable}
              actionHandlers={{
                updateTask: async (values) => {
                  const formValues = values as {
                    title?: string;
                    completed?: boolean;
                  };
                  const res = await apiFetcher(
                    apiEndpoints.tasks.byId(editingTask.id),
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        title: String(formValues.title || editingTask.title),
                        completed: Boolean(formValues.completed),
                      }),
                    },
                  );
                  if (!res.ok)
                    throw new Error(`Request failed with ${res.status}`);
                  setEditingTask(null);
                  refreshTable();
                  toast({
                    variant: "success",
                    title: t("toast.updated"),
                  });
                },
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
