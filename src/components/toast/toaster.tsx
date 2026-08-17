"use client";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";
import { useToast } from "./use-toast";

/**
 * Mount once near the root of the app (see `app-shell` / root layout). Every
 * call to `toast()` from anywhere in the app -- form/table `onSuccess`,
 * `onError`, sign-out, a plain fetch catch block -- renders here.
 */
export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      {toasts.map(
        ({ id, title, description, action, variant, open, duration }) => (
          <Toast
            key={id}
            variant={variant}
            open={open}
            duration={duration}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) dismiss(id);
            }}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        ),
      )}
      <ToastViewport />
    </ToastProvider>
  );
}
