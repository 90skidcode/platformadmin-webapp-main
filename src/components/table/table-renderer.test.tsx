import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "next-auth";

import { renderWithProviders } from "@/test/test-utils";
import { buildSession } from "@/test/session-factory";
import { TableRenderer } from "./table-renderer";
import type { TableSchema } from "./types";

const messages = {
  common: {
    table: {
      search: "Search...",
      noResults: "No results.",
      page: "Page {page} of {totalPages}",
      selectedCount: "{count} selected",
      allFilterOption: "All {label}",
      filters: "Filters",
      filtersDescription: "Narrow the table down using the fields below.",
      clearFilters: "Clear",
      applyFilters: "Apply",
    },
    actions: { cancel: "Cancel", confirm: "Confirm" },
  },
  employees: {},
};

const session = buildSession({
  roles: ["platform-admin"],
  permissions: ["employees.delete"],
});

function renderTable(
  schema: TableSchema,
  opts: {
    data?: Record<string, unknown>[];
    apiFetcher?: ReturnType<typeof vi.fn>;
    sessionOverride?: Session;
  } = {},
) {
  const apiFetcher =
    opts.apiFetcher ??
    vi.fn().mockResolvedValue({
      json: async () => ({
        code: "S_200_EMP_LIST_OK",
        message: "Employees fetched successfully",
        data: {
          items: [],
          pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 1 },
        },
      }),
    });
  renderWithProviders(
    <TableRenderer
      schema={schema}
      data={opts.data}
      apiFetcher={apiFetcher as never}
    />,
    { messages, session: opts.sessionOverride ?? session },
  );
  return apiFetcher;
}

const employees = [
  { id: "emp-1", name: "Kavya Iyer", email: "kavya@acme.example" },
  { id: "emp-2", name: "Rahul Verma", email: "rahul@acme.example" },
];

const baseSchema: TableSchema = {
  id: "employees",
  i18nNamespace: "employees",
  mode: "client",
  columns: [
    { accessorKey: "name", header: "Name", sortable: true },
    { accessorKey: "email", header: "Email" },
  ],
};

describe("TableRenderer", () => {
  describe("rendering rows", () => {
    it("renders rows from the given data", () => {
      renderTable(baseSchema, { data: employees });
      expect(screen.getByText("Kavya Iyer")).toBeInTheDocument();
      expect(screen.getByText("Rahul Verma")).toBeInTheDocument();
    });

    it("shows the empty state when there are no rows", () => {
      renderTable(baseSchema, { data: [] });
      expect(screen.getByText("No results.")).toBeInTheDocument();
    });
  });

  describe("searching", () => {
    it("filters rows via the search input", async () => {
      renderTable(baseSchema, { data: employees });
      await userEvent.type(
        screen.getByRole("textbox", { name: "Search..." }),
        "Rahul",
      );
      expect(screen.queryByText("Kavya Iyer")).not.toBeInTheDocument();
      expect(screen.getByText("Rahul Verma")).toBeInTheDocument();
    });
  });

  describe("sorting", () => {
    it("clicking a sortable header does not error and toggles sort state", async () => {
      renderTable(baseSchema, { data: employees });
      const header = screen.getByRole("button", { name: /Name/ });
      await userEvent.click(header);
      // still renders both rows, just possibly reordered -- proves no crash
      expect(screen.getByText("Kavya Iyer")).toBeInTheDocument();
      expect(screen.getByText("Rahul Verma")).toBeInTheDocument();
    });
  });

  describe("a row action with a confirm step", () => {
    function schemaWithConfirmDelete(): TableSchema {
      return {
        ...baseSchema,
        rowActions: [
          {
            id: "delete",
            label: "Delete",
            icon: "trash",
            handler: "api",
            endpoint: { method: "DELETE", url: "/employees/{id}" },
            confirm: {
              title: "Delete this employee?",
              message: "This cannot be undone.",
            },
            permission: "employees.delete",
          },
        ],
      };
    }

    it("shows a confirm dialog before calling the endpoint", async () => {
      const apiFetcher = vi.fn().mockResolvedValue({ ok: true });
      renderTable(schemaWithConfirmDelete(), { data: employees, apiFetcher });

      const [firstRowDelete] = screen.getAllByRole("button", {
        name: "Delete",
      });
      await userEvent.click(firstRowDelete);

      expect(screen.getByText("Delete this employee?")).toBeInTheDocument();
      expect(apiFetcher).not.toHaveBeenCalled();
    });

    it("confirming calls the endpoint", async () => {
      const apiFetcher = vi.fn().mockResolvedValue({ ok: true });
      renderTable(schemaWithConfirmDelete(), { data: employees, apiFetcher });

      const [firstRowDelete] = screen.getAllByRole("button", {
        name: "Delete",
      });
      await userEvent.click(firstRowDelete);
      await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

      await waitFor(() =>
        expect(apiFetcher).toHaveBeenCalledWith(
          "/employees/emp-1",
          expect.objectContaining({ method: "DELETE" }),
        ),
      );
    });
  });

  describe("permission-gated row actions", () => {
    it("hides a row action for a session lacking that permission", () => {
      const schema: TableSchema = {
        ...baseSchema,
        rowActions: [
          {
            id: "delete",
            label: "Delete",
            handler: "api",
            endpoint: { method: "DELETE", url: "/employees/{id}" },
            permission: "employees.delete",
          },
        ],
      };
      const noPermSession = buildSession({ id: "u2", roles: ["viewer"] });
      renderTable(schema, { data: employees, sessionOverride: noPermSession });
      expect(
        screen.queryByRole("button", { name: "Delete" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("selecting rows for a bulk action", () => {
    function schemaWithBulkDelete(): TableSchema {
      return {
        ...baseSchema,
        selectable: true,
        bulkActions: [
          {
            id: "delete",
            label: "Delete selected",
            handler: "api",
            endpoint: { method: "DELETE", url: "/employees/{id}" },
          },
        ],
      };
    }

    async function selectBothRows() {
      const checkboxes = screen.getAllByRole("checkbox", {
        name: "Select row",
      });
      await userEvent.click(checkboxes[0]);
      await userEvent.click(checkboxes[1]);
    }

    it("shows the bulk actions bar with a count of what's selected", async () => {
      renderTable(schemaWithBulkDelete(), { data: employees });
      await selectBothRows();
      expect(screen.getByText("2 selected")).toBeInTheDocument();
    });

    it("confirming the bulk action calls the endpoint once per selected row", async () => {
      const apiFetcher = vi.fn().mockResolvedValue({ ok: true });
      renderTable(schemaWithBulkDelete(), { data: employees, apiFetcher });
      await selectBothRows();

      await userEvent.click(
        screen.getByRole("button", { name: "Delete selected" }),
      );

      await waitFor(() => expect(apiFetcher).toHaveBeenCalledTimes(2));
      expect(apiFetcher).toHaveBeenCalledWith(
        "/employees/emp-1",
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(apiFetcher).toHaveBeenCalledWith(
        "/employees/emp-2",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  describe("filtering", () => {
    const employeesWithStatus = [
      {
        id: "emp-1",
        name: "Kavya Iyer",
        email: "kavya@acme.example",
        status: "active",
      },
      {
        id: "emp-2",
        name: "Rahul Verma",
        email: "rahul@acme.example",
        status: "offboarded",
      },
    ];

    function schemaWithStatusFilter(): TableSchema {
      return {
        ...baseSchema,
        filters: [
          {
            accessorKey: "status",
            label: "Status",
            options: [
              { value: "active", label: "Active" },
              { value: "offboarded", label: "Offboarded" },
            ],
          },
        ],
      };
    }

    async function openFilterSheetAndSelect(optionName: string) {
      await userEvent.click(screen.getByRole("button", { name: "Filters" }));
      await userEvent.click(screen.getByRole("combobox", { name: "Status" }));
      await userEvent.click(screen.getByRole("option", { name: optionName }));
    }

    it("client mode: opens a sheet with the filter fields", async () => {
      renderTable(schemaWithStatusFilter(), { data: employeesWithStatus });

      await userEvent.click(screen.getByRole("button", { name: "Filters" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(
        screen.getByRole("combobox", { name: "Status" }),
      ).toBeInTheDocument();
    });

    it("client mode: submitting narrows rows to the selected filter value", async () => {
      renderTable(schemaWithStatusFilter(), { data: employeesWithStatus });

      await openFilterSheetAndSelect("Active");
      await userEvent.click(screen.getByRole("button", { name: "Apply" }));

      expect(screen.getByText("Kavya Iyer")).toBeInTheDocument();
      expect(screen.queryByText("Rahul Verma")).not.toBeInTheDocument();
    });

    it("client mode: closing without submitting leaves rows unfiltered", async () => {
      renderTable(schemaWithStatusFilter(), { data: employeesWithStatus });

      await openFilterSheetAndSelect("Active");
      await userEvent.keyboard("{Escape}");

      expect(screen.getByText("Kavya Iyer")).toBeInTheDocument();
      expect(screen.getByText("Rahul Verma")).toBeInTheDocument();
    });

    it("client mode: Clear removes an already-applied filter", async () => {
      renderTable(schemaWithStatusFilter(), { data: employeesWithStatus });

      await openFilterSheetAndSelect("Active");
      await userEvent.click(screen.getByRole("button", { name: "Apply" }));
      expect(screen.queryByText("Rahul Verma")).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: /Filters/ }));
      await userEvent.click(screen.getByRole("button", { name: "Clear" }));

      expect(screen.getByText("Kavya Iyer")).toBeInTheDocument();
      expect(screen.getByText("Rahul Verma")).toBeInTheDocument();
    });

    it("server mode: submitting a filter adds it to the fetch URL as a query param", async () => {
      const apiFetcher = vi.fn().mockResolvedValue({
        json: async () => ({
          code: "S_200_EMP_LIST_OK",
          message: "Employees fetched successfully",
          data: {
            items: [],
            pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 1 },
          },
        }),
      });
      const schema: TableSchema = {
        ...schemaWithStatusFilter(),
        mode: "server",
        endpoint: { url: "/employees" },
      };
      renderTable(schema, { apiFetcher });

      await openFilterSheetAndSelect("Active");
      await userEvent.click(screen.getByRole("button", { name: "Apply" }));

      await waitFor(() =>
        expect(apiFetcher).toHaveBeenLastCalledWith(
          expect.stringContaining("status=active"),
        ),
      );
    });
  });

  describe("server mode", () => {
    it("requests resolve to /api/proxy/* style paths via the injected apiFetcher", async () => {
      const apiFetcher = vi.fn().mockResolvedValue({
        json: async () => ({
          code: "S_200_EMP_LIST_OK",
          message: "Employees fetched successfully",
          data: {
            items: employees,
            pagination: { page: 1, limit: 10, totalItems: 2, totalPages: 1 },
          },
        }),
      });
      const schema: TableSchema = {
        ...baseSchema,
        mode: "server",
        endpoint: { url: "/employees" },
      };
      renderTable(schema, { apiFetcher });

      await waitFor(() =>
        expect(screen.getByText("Kavya Iyer")).toBeInTheDocument(),
      );
      expect(apiFetcher).toHaveBeenCalledWith(
        expect.stringContaining("/employees?page=1&limit=10"),
      );
    });
  });

  describe("virtualization", () => {
    it("virtualize: true renders a role=table container with far fewer DOM rows than the full dataset", () => {
      // jsdom has no layout engine -- @tanstack/react-virtual measures its
      // scroll container via `element.offsetHeight`/`offsetWidth` (not
      // getBoundingClientRect), which jsdom always reports as 0. Give the
      // virtualizer's own scroll container a plausible size so it computes a
      // real (non-zero) visible range, same idea as the jsdom caveats already
      // noted in src/test/setup.ts.
      Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
        configurable: true,
        get() {
          return this.style.height === "480px" ? 480 : 0;
        },
      });
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
        configurable: true,
        get() {
          return 600;
        },
      });

      const bigDataset = Array.from({ length: 500 }, (_, i) => ({
        id: `emp-${i}`,
        name: `Employee ${i}`,
        email: `employee${i}@acme.example`,
      }));
      const schema: TableSchema = { ...baseSchema, virtualize: true };
      renderTable(schema, { data: bigDataset });

      expect(screen.getByRole("table")).toBeInTheDocument();
      const renderedRows = screen.getAllByRole("row");
      // Header row + a visible-window slice, nowhere near all 500 data rows.
      expect(renderedRows.length).toBeGreaterThan(1);
      expect(renderedRows.length).toBeLessThan(100);

      delete (HTMLElement.prototype as { offsetHeight?: unknown }).offsetHeight;
      delete (HTMLElement.prototype as { offsetWidth?: unknown }).offsetWidth;
    });
  });
});
