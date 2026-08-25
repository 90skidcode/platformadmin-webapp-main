import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// next/navigation's useRouter() throws outside an actual App Router tree.
// FormActions/TableRenderer call it for `redirect`/row navigation, so every
// test file gets a stub router unless it supplies its own vi.mock.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// jsdom doesn't implement these, but the local UI primitives (Select,
// Tooltip, Dialog, Toast, etc. -- src/components/ui/primitives/) reach for
// them during interaction tests -- stub them once, globally, here.

if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

if (window.ResizeObserver === undefined) {
  class ResizeObserverStub {
    observe() {
      /* jsdom has no layout engine -- nothing to observe */
    }
    unobserve() {
      /* no-op, see observe() */
    }
    disconnect() {
      /* no-op, see observe() */
    }
  }
  window.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}

if (typeof Element.prototype.hasPointerCapture !== "function") {
  Element.prototype.hasPointerCapture = () => false;
}
if (typeof Element.prototype.setPointerCapture !== "function") {
  Element.prototype.setPointerCapture = () => {};
}
if (typeof Element.prototype.releasePointerCapture !== "function") {
  Element.prototype.releasePointerCapture = () => {};
}
if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = () => {};
}
