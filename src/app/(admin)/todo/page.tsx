"use client";
import { TableRenderer, type TableSchema } from "@/components/table";
import { Button } from "@/components/ui";
import { useState } from "react";

interface TodoRow {
  [key: string]: unknown;
  id: string;
  title: string;
  completed: string;
}
export default function Todo() {
  const [schema, setSchema] = useState({
    id: "todo-table",
    i18nNamespace: "tables.todo",
    mode: "client",
    endpoint: { url: "/todos" },
    search: { enabled: true },
    pageSize: 10,
    columns: [
      { accessorKey: "title", headerKey: "columns.title", sortable: true },
      { accessorKey: "completed", headerKey: "columns.completed" },
    ],
    filters: [
      {
        accessorKey: "completed",
        labelKey: "columns.completed",
        options: [
          { value: "true", labelKey: "status.completed" },
          { value: "false", labelKey: "status.pending" },
        ],
      },
    ],
  });
  const clientSideRender = schema.mode === "client";
  const switchRender = () => {
    setSchema((prevSchema) => {
      return {
        ...prevSchema,
        mode: prevSchema.mode === "client" ? "server" : "client",
      };
    });
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Todo
            <span className="pl-2 text-muted-foreground">
              {clientSideRender ? "Client" : "Server"}-side Rendering
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Currently rendered on the {clientSideRender ? "client" : "server"}
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={switchRender}>
          Switch to {clientSideRender ? "Server" : "Client"}
        </Button>
      </div>
      {!clientSideRender && (
        <span className="pl-2 text-muted-foreground">
          Pagination parameters may differ from the external API, so pagination
          might not display correctly.
        </span>
      )}
      <TableRenderer<TodoRow> schema={schema as unknown as TableSchema} />
    </div>
  );
}
