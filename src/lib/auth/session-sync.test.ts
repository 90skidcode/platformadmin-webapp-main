import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  broadcastSessionActivity,
  broadcastSessionExpired,
  broadcastSessionExtended,
  subscribeToSessionSync,
  _resetSessionSyncChannel,
  type SessionSyncEvent,
} from "./session-sync";
import {
  SESSION_EXPIRY_REASONS,
  SESSION_SYNC_EVENTS,
  SESSION_SYNC_STORAGE_KEY,
} from "./session-constants";

describe("BRD: Multi-Tab Inactivity Synchronization", () => {
  let mockPostMessage: ReturnType<typeof vi.fn>;
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockPostMessage = vi.fn();
    mockStorage = {};

    class MockBroadcastChannel {
      name: string;
      onmessage: ((event: MessageEvent) => void) | null = null;
      constructor(name: string) {
        this.name = name;
      }
      postMessage = mockPostMessage;
      close = vi.fn();
    }

    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    if (typeof window !== "undefined") {
      window.BroadcastChannel =
        MockBroadcastChannel as unknown as typeof BroadcastChannel;
    }

    vi.stubGlobal("localStorage", {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    });

    _resetSessionSyncChannel();
  });

  afterEach(() => {
    _resetSessionSyncChannel();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("notifies all open browser tabs when user activity occurs so all inactivity timers reset", () => {
    const timestamp = Date.now();
    broadcastSessionActivity(timestamp);

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: SESSION_SYNC_EVENTS.ACTIVITY,
      lastActiveAt: timestamp,
    });
    expect(mockStorage[SESSION_SYNC_STORAGE_KEY]).toContain(
      `"type":"${SESSION_SYNC_EVENTS.ACTIVITY}"`,
    );
  });

  it("notifies all open tabs to dismiss warning modals and extend session when user clicks Continue Session", () => {
    const timestamp = Date.now();
    broadcastSessionExtended(timestamp);

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: SESSION_SYNC_EVENTS.EXTENDED,
      lastActiveAt: timestamp,
    });
  });

  it("notifies all open tabs to immediately log out when an inactivity expiration occurs in any tab", () => {
    broadcastSessionExpired(SESSION_EXPIRY_REASONS.INACTIVITY_TIMEOUT);

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: SESSION_SYNC_EVENTS.EXPIRED,
      reason: SESSION_EXPIRY_REASONS.INACTIVITY_TIMEOUT,
    });
  });

  it("receives cross-tab session events via browser storage synchronization fallback", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSessionSync(listener);

    const eventData: SessionSyncEvent = {
      type: SESSION_SYNC_EVENTS.ACTIVITY,
      lastActiveAt: 123456,
    };

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: SESSION_SYNC_STORAGE_KEY,
        newValue: JSON.stringify(eventData),
      }),
    );

    expect(listener).toHaveBeenCalledWith(eventData);
    unsubscribe();
  });

  it("cleans up event listeners when the subscriber unmounts", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSessionSync(listener);
    unsubscribe();

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: SESSION_SYNC_STORAGE_KEY,
        newValue: JSON.stringify({ type: SESSION_SYNC_EVENTS.LOGOUT }),
      }),
    );

    expect(listener).not.toHaveBeenCalled();
  });
});
