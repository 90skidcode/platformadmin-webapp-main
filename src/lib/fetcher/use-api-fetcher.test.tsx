import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

const signOutMock = vi.fn();
vi.mock("next-auth/react", async () => {
  const actual =
    await vi.importActual<typeof import("next-auth/react")>("next-auth/react");
  return { ...actual, signOut: (...args: unknown[]) => signOutMock(...args) };
});

const toastMock = vi.fn();
vi.mock("@/components/toast", () => ({
  toast: (...args: unknown[]) => toastMock(...args),
}));

const messages = {
  common: { topbar: { sessionExpiredToast: "Your session has expired." } },
};

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// `useApiFetcher` tracks "already handled a 401" as module state (deliberately,
// so several tables/forms 401-ing around the same time only sign out once --
// see the file's own comment). Each test needs a fresh copy of that state.
beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  signOutMock.mockClear();
  toastMock.mockClear();
});

describe("useApiFetcher", () => {
  describe("calling the returned fetcher", () => {
    it("calls the exact same-origin path it's given and nothing else", async () => {
      const fetchMock = stubFetch(new Response("{}"));
      const { useApiFetcher } = await import("./use-api-fetcher");

      const { result } = renderHook(() => useApiFetcher(), { wrapper });
      await result.current("/api/proxy/employees");

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/proxy/employees");
      // No Authorization header and no external host -- that all moved server-side.
      expect(options?.headers ?? {}).not.toHaveProperty("Authorization");
    });

    it("passes through request options like method and body", async () => {
      stubFetch(new Response("{}"));
      const { useApiFetcher } = await import("./use-api-fetcher");
      const fetchMock = vi.mocked(fetch);

      const { result } = renderHook(() => useApiFetcher(), { wrapper });
      await result.current("/api/proxy/employees", {
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

    it("resolves with the response unchanged on a non-401", async () => {
      stubFetch(new Response("{}", { status: 200 }));
      const { useApiFetcher } = await import("./use-api-fetcher");

      const { result } = renderHook(() => useApiFetcher(), { wrapper });
      const res = await result.current("/employees");

      expect(res.status).toBe(200);
      expect(signOutMock).not.toHaveBeenCalled();
      expect(toastMock).not.toHaveBeenCalled();
    });
  });

  describe("across re-renders", () => {
    it("returns a stable callback", async () => {
      stubFetch(new Response("{}"));
      const { useApiFetcher } = await import("./use-api-fetcher");

      const { result, rerender } = renderHook(() => useApiFetcher(), {
        wrapper,
      });
      const first = result.current;
      rerender();
      expect(result.current).toBe(first);
    });
  });

  describe("on a 401", () => {
    it("shows a toast and forces sign-out via next-auth, redirecting to /login", async () => {
      stubFetch(new Response("{}", { status: 401 }));
      const { useApiFetcher } = await import("./use-api-fetcher");

      const { result } = renderHook(() => useApiFetcher(), { wrapper });
      await result.current("/employees");

      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "error",
          description: "Your session has expired.",
        }),
      );
      expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: "/login" });
    });

    it("still resolves with the 401 response so callers don't throw", async () => {
      stubFetch(new Response("{}", { status: 401 }));
      const { useApiFetcher } = await import("./use-api-fetcher");

      const { result } = renderHook(() => useApiFetcher(), { wrapper });
      const res = await result.current("/employees");

      expect(res.status).toBe(401);
    });

    it("only signs out once when multiple requests 401 around the same time", async () => {
      stubFetch(new Response("{}", { status: 401 }));
      const { useApiFetcher } = await import("./use-api-fetcher");

      const { result } = renderHook(() => useApiFetcher(), { wrapper });
      await Promise.all([
        result.current("/employees"),
        result.current("/users"),
      ]);

      expect(signOutMock).toHaveBeenCalledOnce();
      expect(toastMock).toHaveBeenCalledOnce();
    });
  });
});
