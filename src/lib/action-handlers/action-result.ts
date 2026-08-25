import { toast } from "@/components/toast";

export interface ToastActionConfig {
  variant?: "default" | "success" | "warning" | "error" | "info";
  title?: string;
  titleKey?: string;
  message?: string;
  messageKey?: string;
}

/** `onSuccess`/`onError` shape shared by form actions and table row/bulk
 * actions (plan §7.1/§7.2) -- how each fires differs, but this result shape
 * doesn't. */
export interface ActionResultConfig {
  toast?: ToastActionConfig;
  redirect?: string;
  refetch?: boolean;
}

export interface TriggerToastContext {
  /** Resolves an i18n key to display text; falls back to the raw key without one. */
  translate?: (key: string) => string;
  router?: { push: (href: string) => void };
  refetch?: () => void;
}

/**
 * Plan §6.4/§9/§11: the one place `onSuccess`/`onError` (and sign-out) turn
 * into an actual toast + redirect + refetch. Both `FormActions` and
 * `TableRenderer` call this after every action -- one implementation, not a
 * one-off `toast()` call scattered per call site.
 */
export function triggerToastFromConfig(
  config: ActionResultConfig | undefined,
  ctx: TriggerToastContext = {},
) {
  if (!config) return;

  if (config.toast) {
    const {
      variant = "default",
      title,
      titleKey,
      message,
      messageKey,
    } = config.toast;
    toast({
      variant,
      title: titleKey ? (ctx.translate?.(titleKey) ?? titleKey) : title,
      description: messageKey
        ? (ctx.translate?.(messageKey) ?? messageKey)
        : message,
    });
  }

  if (config.redirect) ctx.router?.push(config.redirect);
  if (config.refetch) ctx.refetch?.();
}
