"use client";

import * as React from "react";

export type ToastVariant = "default" | "success" | "warning" | "error" | "info";

export interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  /** Milliseconds before auto-dismiss. Set to `Infinity` to require manual dismissal. */
  duration?: number;
  action?: React.ReactNode;
}

export interface ToastRecord extends ToastOptions {
  id: string;
  open: boolean;
}

type Listener = (toasts: ToastRecord[]) => void;

const DEFAULT_DURATION = 5000;
const MAX_TOASTS = 4;

// Module-level store (not React context) so `toast()` is callable from plain
// functions -- action handlers, fetch error paths, etc. -- not just components.
let toasts: ToastRecord[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener(toasts);
}

function genId() {
  // crypto.randomUUID, not Math.random() -- keeps this clean of SonarQube S2245
  // (insecure randomness) even though a DOM key/id has no security stakes here.
  return `toast-${crypto.randomUUID()}`;
}

/** Dismisses every currently-visible toast -- useful on sign-out or route change. */
export function dismissAllToasts() {
  toasts.forEach((t) => dismissToast(t.id));
}

export function dismissToast(id: string) {
  toasts = toasts.map((t) => (t.id === id ? { ...t, open: false } : t));
  emit();
  // Give the close animation a moment before removing from the DOM entirely.
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 200);
}

export function toast(options: ToastOptions): {
  id: string;
  dismiss: () => void;
} {
  const id = genId();
  const record: ToastRecord = {
    id,
    open: true,
    variant: "default",
    duration: DEFAULT_DURATION,
    ...options,
  };
  toasts = [record, ...toasts].slice(0, MAX_TOASTS);
  emit();
  return { id, dismiss: () => dismissToast(id) };
}

export function useToast() {
  const [state, setState] = React.useState<ToastRecord[]>(toasts);

  React.useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return {
    toasts: state,
    toast,
    dismiss: dismissToast,
  };
}
