import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { SESSION_EXPIRED_LOGIN_URL } from "@/lib/auth/session-constants";

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

const broadcastActivityMock = vi.fn();
const broadcastExpiredMock = vi.fn();
vi.mock("@/lib/auth/session-sync", () => ({
  broadcastSessionActivity: (...args: unknown[]) =>
    broadcastActivityMock(...args),
  broadcastSessionExpired: (...args: unknown[]) =>
    broadcastExpiredMock(...args),
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

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  signOutMock.mockClear();
  toastMock.mockClear();
  broadcastActivityMock.mockClear();
  broadcastExpiredMock.mockClear();
});

describe("BRD: API Client Session Lifecycle & Expiry Handling", () => {
  describe("Calling API endpoints through the BFF Proxy", () => {
    it("routes API requests directly to same-origin proxy without exposing upstream credentials", async () => {
      const fetchMock = stubFetch(new Response("{}"));
      const { useApiFetcher } = await import("./use-api-fetcher");

      const { result } = renderHook(() => useApiFetcher(), { wrapper });
      await result.current("/api/proxy/employees");

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/proxy/employees");
      expect(options?.headers?.get?.("x-background-activity")).toBeFalsy();
    });

    it("attaches background-activity indicator when performing automated background operations", async () => {
      const fetchMock = stubFetch(new Response("{}"));
      const { useApiFetcher } = await import("./use-api-fetcher");

      const { result } = renderHook(() => useApiFetcher(), { wrapper });
      await result.current("/api/proxy/employees", { isBackground: true });

      expect(fetchMock).toHaveBeenCalledOnce();
      const [, options] = fetchMock.mock.calls[0];
      expect(options?.headers?.get?.("x-background-activity")).toBe("true");
    });

    it("synchronizes user activity across all tabs upon receiving qualifying response header", async () => {
      const response = new Response("{}", {
        status: 200,
        headers: { "X-Session-Last-Active": "1700000000000" },
      });
      stubFetch(response);
      const { useApiFetcher } = await import("./use-api-fetcher");

      const { result } = renderHook(() => useApiFetcher(), { wrapper });
      await result.current("/api/proxy/employees");

      expect(broadcastActivityMock).toHaveBeenCalledWith(1700000000000);
    });

    it("passes through standard request parameters such as HTTP method and payload body", async () => {
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
  });

  describe("Unauthorized (401) Session Expiration Handling", () => {
    it("notifies the user with a session expired message, broadcasts logout to other tabs, and redirects to login", async () => {
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
      expect(broadcastExpiredMock).toHaveBeenCalledOnce();
      expect(signOutMock).toHaveBeenCalledWith({
        callbackUrl: SESSION_EXPIRED_LOGIN_URL,
      });
    });
  });
});
