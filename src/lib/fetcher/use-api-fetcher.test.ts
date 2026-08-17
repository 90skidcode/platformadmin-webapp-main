import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { useApiFetcher } from "./use-api-fetcher";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch() {
  const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("useApiFetcher", () => {
  describe("calling the returned fetcher", () => {
    it("calls the same-origin /api/proxy path and nothing else", async () => {
      const fetchMock = stubFetch();

      const { result } = renderHook(() => useApiFetcher());
      await result.current("/employees");

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/proxy/employees");
      // No Authorization header and no external host -- that all moved server-side.
      expect(options?.headers ?? {}).not.toHaveProperty("Authorization");
    });

    it("passes through request options like method and body", async () => {
      const fetchMock = stubFetch();

      const { result } = renderHook(() => useApiFetcher());
      await result.current("/employees", {
        method: "POST",
        body: JSON.stringify({ name: "Kavya" }),
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/proxy/employees",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "Kavya" }),
        }),
      );
    });
  });

  describe("across re-renders", () => {
    it("returns a stable callback", () => {
      const { result, rerender } = renderHook(() => useApiFetcher());
      const first = result.current;
      rerender();
      expect(result.current).toBe(first);
    });
  });
});
