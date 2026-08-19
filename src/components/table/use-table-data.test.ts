import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useTableData } from "./use-table-data";
import type { TableSchema } from "./types";

const columns: TableSchema["columns"] = [
  { accessorKey: "name" },
  { accessorKey: "email" },
];

describe("useTableData", () => {
  describe("client mode", () => {
    it("uses the given static data without fetching", () => {
      const apiFetcher = vi.fn();
      const schema: TableSchema = {
        id: "t",
        mode: "client",
        columns,
        pageSize: 10,
      };
      const data = [{ name: "Kavya", email: "kavya@acme.example" }];

      const { result } = renderHook(() =>
        useTableData(schema, data, apiFetcher),
      );

      expect(result.current.rows).toEqual(data);
      expect(apiFetcher).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
    });

    it("filters rows across all columns by the search term", () => {
      const schema: TableSchema = {
        id: "t",
        mode: "client",
        columns,
        pageSize: 10,
      };
      const data = [
        { name: "Kavya Iyer", email: "kavya@acme.example" },
        { name: "Rahul Verma", email: "rahul@acme.example" },
      ];
      const { result } = renderHook(() => useTableData(schema, data, vi.fn()));

      act(() => result.current.setSearch("rahul"));

      expect(result.current.rows).toEqual([
        { name: "Rahul Verma", email: "rahul@acme.example" },
      ]);
      expect(result.current.total).toBe(1);
    });

    it("resets to page 0 when the search term changes", () => {
      const schema: TableSchema = {
        id: "t",
        mode: "client",
        columns,
        pageSize: 10,
      };
      const { result } = renderHook(() => useTableData(schema, [], vi.fn()));

      act(() => result.current.setPageIndex(2));
      expect(result.current.pageIndex).toBe(2);
      act(() => result.current.setSearch("x"));
      expect(result.current.pageIndex).toBe(0);
    });

    it("Fetches data once on initial load and sorts it without additional API calls", async () => {
      const apiFetcher = vi.fn().mockResolvedValue({
        json: async () => ({
          code: "S_200_EMP_LIST_OK",
          message: "Employees fetched successfully",
          data: [
            { name: "Kavya Iyer", email: "kavya@acme.example" },
            { name: "Rahul Verma", email: "rahul@acme.example" },
          ],
        }),
      });
      const schema: TableSchema = {
        id: "t",
        mode: "client",
        endpoint: { url: "/employees" },
        columns,
        pageSize: 10,
      };

      const { result } = renderHook(() =>
        useTableData(schema, undefined, apiFetcher),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(apiFetcher).toHaveBeenCalledTimes(1);

      act(() => result.current.setSorting([{ id: "name", desc: true }]));

      expect(apiFetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe("server mode", () => {
    const serverSchema: TableSchema = {
      id: "t",
      mode: "server",
      endpoint: { url: "/employees" },
      columns,
      pageSize: 10,
    };

    it("fetches from schema.endpoint with page/pageSize query params", async () => {
      const apiFetcher = vi.fn().mockResolvedValue({
        json: async () => ({
          code: "S_200_EMP_LIST_OK",
          message: "Employees fetched successfully",
          data: {
            items: [{ name: "Kavya" }],
            pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
          },
        }),
      });

      const { result } = renderHook(() =>
        useTableData(serverSchema, undefined, apiFetcher),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(apiFetcher).toHaveBeenCalledWith(
        expect.stringContaining("/employees?page=1&pageSize=10"),
      );
      expect(result.current.rows).toEqual([{ name: "Kavya" }]);
      expect(result.current.total).toBe(1);
    });

    it("refetches with sortBy/sortDir when sorting changes", async () => {
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
      const { result } = renderHook(() =>
        useTableData(serverSchema, undefined, apiFetcher),
      );
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => result.current.setSorting([{ id: "name", desc: true }]));
      await waitFor(() =>
        expect(apiFetcher).toHaveBeenLastCalledWith(
          expect.stringContaining("sortBy=name&sortDir=desc"),
        ),
      );
    });

    it("sets error when the fetch fails, without throwing", async () => {
      const apiFetcher = vi.fn().mockRejectedValue(new Error("network down"));
      const { result } = renderHook(() =>
        useTableData(serverSchema, undefined, apiFetcher),
      );

      await waitFor(() => expect(result.current.error).toBe(true));
      expect(result.current.loading).toBe(false);
    });
  });
});
