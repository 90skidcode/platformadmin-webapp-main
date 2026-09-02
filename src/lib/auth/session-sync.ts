"use client";

import {
  SESSION_SYNC_CHANNEL_NAME,
  SESSION_SYNC_EVENTS,
  SESSION_SYNC_STORAGE_KEY,
} from "./session-constants";

export type SessionSyncEvent =
  | { type: typeof SESSION_SYNC_EVENTS.ACTIVITY; lastActiveAt: number }
  | { type: typeof SESSION_SYNC_EVENTS.EXTENDED; lastActiveAt: number }
  | { type: typeof SESSION_SYNC_EVENTS.EXPIRED; reason?: string }
  | { type: typeof SESSION_SYNC_EVENTS.LOGOUT };

type SyncListener = (event: SessionSyncEvent) => void;

let channel: BroadcastChannel | null = null;
const listeners = new Set<SyncListener>();

function getBroadcastChannelClass(): typeof BroadcastChannel | undefined {
  if (typeof window !== "undefined" && window.BroadcastChannel) {
    return window.BroadcastChannel;
  }
  if (typeof globalThis !== "undefined" && globalThis.BroadcastChannel) {
    return globalThis.BroadcastChannel;
  }
  return undefined;
}

function getChannel(): BroadcastChannel | null {
  const BC = getBroadcastChannelClass();
  if (!BC) return null;

  if (!channel) {
    try {
      channel = new BC(SESSION_SYNC_CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<SessionSyncEvent>) => {
        if (
          event.data &&
          typeof event.data === "object" &&
          "type" in event.data
        ) {
          notifyListeners(event.data);
        }
      };
    } catch {
      channel = null;
    }
  }
  return channel;
}

export function _resetSessionSyncChannel(): void {
  if (channel) {
    try {
      channel.close();
    } catch {
      // Ignore close error
    }
    channel = null;
  }
  listeners.clear();
}

function notifyListeners(event: SessionSyncEvent) {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      console.error("[session-sync] listener threw", err);
    }
  });
}

function handleStorageEvent(event: StorageEvent) {
  if (event.key === SESSION_SYNC_STORAGE_KEY && event.newValue) {
    try {
      const parsed = JSON.parse(event.newValue) as SessionSyncEvent;
      if (parsed && typeof parsed === "object" && "type" in parsed) {
        notifyListeners(parsed);
      }
    } catch {
      // Ignore JSON parse errors
    }
  }
}

/**
 * Broadcasts an event to all other open tabs.
 */
export function broadcastSessionEvent(event: SessionSyncEvent): void {
  const ch = getChannel();
  if (ch) {
    try {
      ch.postMessage(event);
    } catch {
      // Ignore postMessage error
    }
  }

  // Also write to localStorage for browsers or environments where BroadcastChannel is not supported
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(
        SESSION_SYNC_STORAGE_KEY,
        JSON.stringify({ ...event, _t: Date.now() }),
      );
    } catch {
      // Ignore localStorage write failures
    }
  }
}

export function broadcastSessionActivity(lastActiveAt: number): void {
  broadcastSessionEvent({ type: SESSION_SYNC_EVENTS.ACTIVITY, lastActiveAt });
}

export function broadcastSessionExtended(lastActiveAt: number): void {
  broadcastSessionEvent({ type: SESSION_SYNC_EVENTS.EXTENDED, lastActiveAt });
}

export function broadcastSessionExpired(reason?: string): void {
  broadcastSessionEvent({ type: SESSION_SYNC_EVENTS.EXPIRED, reason });
}

/**
 * Subscribes to cross-tab session events. Returns an unsubscribe cleanup function.
 */
export function subscribeToSessionSync(callback: SyncListener): () => void {
  listeners.add(callback);
  getChannel(); // ensure channel is initialized

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageEvent);
  }

  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
}
