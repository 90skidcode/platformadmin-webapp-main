import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useRemoteOptions } from "./use-remote-options";

describe("useRemoteOptions", () => {
  describe("static options", () => {
    it("returns static options synchronously without fetching", () => {
      const { result } = renderHook(() =>
        useRemoteOptions(
          {
            type: "static",
            options: [{ value: "US", label: "United States" }],
          },
          vi.fn() as never,
        ),
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.options).toEqual([
        { value: "US", label: "United States" },
      ]);
    });

    it("filters options by parentValue in static cascading mode", () => {
      const source = {
        type: "static" as const,
        options: [
          { value: "ca", label: "California", parentValue: "US" },
          { value: "ny", label: "New York", parentValue: "US" },
          { value: "tn", label: "Tamil Nadu", parentValue: "IN" },
        ],
      };

      const { result, rerender } = renderHook(
        ({ parentValue }) =>
          useRemoteOptions(source, vi.fn() as never, parentValue),
        { initialProps: { parentValue: "US" } },
      );

      expect(result.current.options).toHaveLength(2);
      expect(result.current.options[0].value).toBe("ca");
      expect(result.current.options[1].value).toBe("ny");

      // Change parentValue to IN
      rerender({ parentValue: "IN" });
      expect(result.current.options).toHaveLength(1);
      expect(result.current.options[0].value).toBe("tn");
    });
  });

  describe("remote options with dependent parentValue", () => {
    it("does not fetch when parentValue is empty for a dependent select", () => {
      const apiFetcher = vi.fn();
      const { result } = renderHook(() =>
        useRemoteOptions(
          {
            type: "remote",
            url: "/api/states?country={country}",
            dependsOn: "country",
          },
          apiFetcher as never,
          "",
        ),
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.options).toEqual([]);
      expect(apiFetcher).not.toHaveBeenCalled();
    });

    it("fetches with interpolated URL once parentValue is provided", async () => {
      const apiFetcher = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              { id: "ca", name: "California" },
              { id: "ny", name: "New York" },
            ],
          }),
          { status: 200 },
        ),
      );

      const { result } = renderHook(() =>
        useRemoteOptions(
          {
            type: "remote",
            url: "/api/states?country={country}",
            valueKey: "id",
            labelKey: "name",
            dependsOn: "country",
          },
          apiFetcher as never,
          "US",
        ),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(apiFetcher).toHaveBeenCalledWith(
        "/api/states?country=US",
        expect.any(Object),
      );
      expect(result.current.options).toEqual([
        { value: "ca", label: "California" },
        { value: "ny", label: "New York" },
      ]);
    });
  });
});
