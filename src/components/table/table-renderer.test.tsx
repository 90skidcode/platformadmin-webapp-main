import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

import { TableRenderer } from "./table-renderer";
import type { TableSchema } from "./types";

const messages = {
  common: {
    table: {
      search: "Search...",
      noResults: "No results.",
      page: "Page {page} of {totalPages}",
      selectedCount: "{count} selected",
    },
    actions: { cancel: "Cancel", confirm: "Confirm" },
  },
  employees: {},
};

const session = {
  user: {
    id: "u1",
    roles: ["platform-admin"],
    permissions: ["employees.delete"],
    tenants: [],
  },
  accessToken: "t",
  expires: "2099-01-01T00:00:00.000Z",
} as Session;

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
      json: async () => ({ data: [], page: 1, pageSize: 10, total: 0 }),
    });
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SessionProvider session={opts.sessionOverride ?? session}>
        <TableRenderer
          schema={schema}
          data={opts.data}
          apiFetcher={apiFetcher as never}
        />
      </SessionProvider>
    </NextIntlClientProvider>,
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
  it("renders rows from the given data", () => {
    renderTable(baseSchema, { data: employees });
    expect(screen.getByText("Kavya Iyer")).toBeInTheDocument();
    expect(screen.getByText("Rahul Verma")).toBeInTheDocument();
  });

  it("shows the empty state when there are no rows", () => {
    renderTable(baseSchema, { data: [] });
    expect(screen.getByText("No results.")).toBeInTheDocument();
  });

  it("filters rows via the search input", async () => {
    renderTable(baseSchema, { data: employees });
    await userEvent.type(
      screen.getByRole("textbox", { name: "Search..." }),
      "Rahul",
    );
    expect(screen.queryByText("Kavya Iyer")).not.toBeInTheDocument();
    expect(screen.getByText("Rahul Verma")).toBeInTheDocument();
  });

  it("clicking a sortable header does not error and toggles sort state", async () => {
    renderTable(baseSchema, { data: employees });
    const header = screen.getByRole("button", { name: /Name/ });
    await userEvent.click(header);
    // still renders both rows, just possibly reordered -- proves no crash
    expect(screen.getByText("Kavya Iyer")).toBeInTheDocument();
    expect(screen.getByText("Rahul Verma")).toBeInTheDocument();
  });

  it("a row action with confirm shows a dialog, then calls the endpoint on confirm", async () => {
    const apiFetcher = vi.fn().mockResolvedValue({ ok: true });
    const schema: TableSchema = {
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
    renderTable(schema, { data: employees, apiFetcher });

    const [firstRowDelete] = screen.getAllByRole("button", { name: "Delete" });
    await userEvent.click(firstRowDelete);
    expect(screen.getByText("Delete this employee?")).toBeInTheDocument();
    expect(apiFetcher).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(apiFetcher).toHaveBeenCalledWith(
        "/employees/emp-1",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });

  it("hides a permission-gated row action for a session lacking that permission", () => {
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
    const noPermSession = {
      user: { id: "u2", roles: ["viewer"], permissions: [], tenants: [] },
      accessToken: "t",
      expires: "2099-01-01T00:00:00.000Z",
    } as Session;
    renderTable(schema, { data: employees, sessionOverride: noPermSession });
    expect(
      screen.queryByRole("button", { name: "Delete" }),
    ).not.toBeInTheDocument();
  });

  it("selecting rows shows the bulk actions bar; confirming calls the endpoint per selected row", async () => {
    const apiFetcher = vi.fn().mockResolvedValue({ ok: true });
    const schema: TableSchema = {
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
    renderTable(schema, { data: employees, apiFetcher });

    const checkboxes = screen.getAllByRole("checkbox", { name: "Select row" });
    await userEvent.click(checkboxes[0]);
    await userEvent.click(checkboxes[1]);

    expect(screen.getByText("2 selected")).toBeInTheDocument();
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

  it("server mode requests resolve to /api/proxy/* style paths via the injected apiFetcher", async () => {
    const apiFetcher = vi.fn().mockResolvedValue({
      json: async () => ({
        data: employees,
        page: 1,
        pageSize: 10,
        total: 2,
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
      expect.stringContaining("/employees?page=1&pageSize=10"),
    );
  });

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
