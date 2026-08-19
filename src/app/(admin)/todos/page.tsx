"use client";

import { useTranslations } from "next-intl";

import { TableRenderer, type TableSchema } from "@/components/table";
import todosTableSchema from "@/schemas/tables/todos-table.json";

interface TodoRow {
  [key: string]: unknown;
  id: number;
  userId: number;
  title: string;
  completed: boolean;
}

export default function TodosPage() {
  const commonT = useTranslations("common");

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          {commonT("nav.todos")}
        </h2>
        <p className="text-sm text-muted-foreground">
          Zero-state client table loaded via endpoint &quot;/todos&quot; from
          JSONPlaceholder.
        </p>
      </div>

      <TableRenderer<TodoRow>
        schema={todosTableSchema as unknown as TableSchema}
      />
    </div>
  );
}
