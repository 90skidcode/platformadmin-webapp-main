"use client";

import * as React from "react";

import { mergeRefs } from "./merge-refs";
import { Slot } from "./slot";
import { useBodyScrollLock } from "./use-body-scroll-lock";
import { useControllableState } from "./use-controllable-state";
import { useEscapeKey } from "./use-escape-key";
import { useFocusTrap } from "./use-focus-trap";
import { usePresence } from "./use-presence";

export type DialogRole = "dialog" | "alertdialog";

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  contentId: string;
  titleId: string;
  descriptionId: string;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export interface DialogRootProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface DialogTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

/**
 * The engine shared by Dialog and AlertDialog -- the same relationship
 * Radix itself has (AlertDialog is a thin, stricter wrapper over Dialog):
 * controllable open state, portal-free content with focus trap, ESC-to-close,
 * and body scroll lock. `role` is the only thing that differs structurally;
 * default chrome (Dialog's close (X) button vs. AlertDialog's forced
 * Cancel/Action choice) is left to each file's own `*Content` component, same
 * as before.
 *
 * Deliberately doesn't reimplement `onEscapeKeyDown`/`onPointerDownOutside`/
 * `onOpenAutoFocus` override hooks or background aria-hiding -- nothing in
 * this app ever passed those Radix escape hatches (verified), and full
 * background aria-hiding is a real accessibility nicety the focus trap
 * already covers most of the practical risk for.
 */
export function createDialog(role: DialogRole) {
  const DialogContext = React.createContext<DialogContextValue | null>(null);

  function useDialogContext(component: string) {
    const context = React.useContext(DialogContext);
    if (!context) {
      throw new Error(`${component} must be used within its Dialog root`);
    }
    return context;
  }

  function Root({
    children,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
  }: Readonly<DialogRootProps>) {
    const [open, setOpen] = useControllableState({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    });
    const triggerRef = React.useRef<HTMLElement | null>(null);
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const contentId = React.useId();
    const titleId = React.useId();
    const descriptionId = React.useId();

    const context = React.useMemo(
      () => ({
        open,
        setOpen,
        contentId,
        titleId,
        descriptionId,
        triggerRef,
        contentRef,
      }),
      [open, setOpen, contentId, titleId, descriptionId],
    );

    return (
      <DialogContext.Provider value={context}>
        {children}
      </DialogContext.Provider>
    );
  }

  const Trigger = React.forwardRef<HTMLElement, DialogTriggerProps>(
    ({ asChild = false, onClick, ...props }, forwardedRef) => {
      const { setOpen, triggerRef, contentId, open } =
        useDialogContext("Trigger");
      const Comp: React.ElementType = asChild ? Slot : "button";
      return (
        <Comp
          ref={mergeRefs(forwardedRef, triggerRef)}
          type={asChild ? undefined : "button"}
          // "alertdialog" isn't a valid aria-haspopup token (the ARIA spec
          // only defines menu/listbox/tree/grid/dialog) -- AlertDialog
          // doesn't advertise aria-haspopup at all, same as Radix's own.
          aria-haspopup={role === "dialog" ? "dialog" : undefined}
          aria-expanded={open}
          aria-controls={contentId}
          onClick={(event: React.MouseEvent<HTMLElement>) => {
            onClick?.(event);
            if (!event.defaultPrevented) setOpen(true);
          }}
          {...props}
        />
      );
    },
  );
  Trigger.displayName = "DialogTrigger";

  const Overlay = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
  >(({ onClick, ...props }, forwardedRef) => {
    const { open, setOpen } = useDialogContext("Overlay");
    const { rendered, nodeRef } = usePresence(open);
    if (!rendered) return null;
    return (
      <div
        ref={mergeRefs(forwardedRef, nodeRef)}
        data-state={open ? "open" : "closed"}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) setOpen(false);
        }}
        {...props}
      />
    );
  });
  Overlay.displayName = "DialogOverlay";

  const Content = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
  >(({ children, onClick, ...props }, forwardedRef) => {
    const { open, setOpen, contentId, titleId, descriptionId, contentRef } =
      useDialogContext("Content");
    const { rendered, nodeRef } = usePresence(open);
    useBodyScrollLock(open);
    useFocusTrap(contentRef, open);
    useEscapeKey(() => setOpen(false), open);

    if (!rendered) return null;

    return (
      <div
        ref={mergeRefs(forwardedRef, contentRef, nodeRef)}
        id={contentId}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-state={open ? "open" : "closed"}
        // Content sits visually above Overlay but is a DOM sibling, not a
        // child -- stop the click here so it can't bubble up to Overlay's
        // click-to-close handler.
        onClick={(event) => {
          onClick?.(event);
          event.stopPropagation();
        }}
        {...props}
      >
        {children}
      </div>
    );
  });
  Content.displayName = "DialogContent";

  const Close = React.forwardRef<HTMLElement, DialogTriggerProps>(
    ({ asChild = false, onClick, ...props }, forwardedRef) => {
      const { setOpen } = useDialogContext("Close");
      const Comp: React.ElementType = asChild ? Slot : "button";
      return (
        <Comp
          ref={mergeRefs(forwardedRef)}
          type={asChild ? undefined : "button"}
          onClick={(event: React.MouseEvent<HTMLElement>) => {
            onClick?.(event);
            if (!event.defaultPrevented) setOpen(false);
          }}
          {...props}
        />
      );
    },
  );
  Close.displayName = "DialogClose";

  const Title = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
  >((props, ref) => {
    const { titleId } = useDialogContext("Title");
    return <h2 ref={ref} id={titleId} {...props} />;
  });
  Title.displayName = "DialogTitle";

  const Description = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
  >((props, ref) => {
    const { descriptionId } = useDialogContext("Description");
    return <p ref={ref} id={descriptionId} {...props} />;
  });
  Description.displayName = "DialogDescription";

  return { Root, Trigger, Overlay, Content, Close, Title, Description };
}
