"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { createDialog } from "../primitives/dialog-base";

// Same engine Dialog uses (portal, focus trap, ESC/outside-click dismiss,
// body scroll lock, role="dialog") -- a Sheet is a Dialog that slides in
// from the right edge instead of centering, nothing about the underlying
// behavior differs. See AGENTS.md-adjacent convention: edit forms with
// fewer than 5 fields open in a Sheet, not a centered popup; 5 or more
// fields get a full page instead (settings-form.ts is the existing
// example of the latter).
const SheetPrimitive = createDialog("dialog");

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

export const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-modal-backdrop bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
    /** Hides the built-in close (X) button -- for flows that only close via an explicit action. */
    hideCloseButton?: boolean;
  }
>(({ className, children, hideCloseButton, ...props }, ref) => (
  <>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-y-0 right-0 z-modal flex size-full max-w-md flex-col gap-4 border-l border-border bg-background p-6 shadow-lg duration-200 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-full data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full",
        className,
      )}
      {...props}
    >
      {children}
      {!hideCloseButton && (
        <SheetPrimitive.Close className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-4 focus:ring-ring/15 focus:outline-none disabled:pointer-events-none">
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      )}
    </SheetPrimitive.Content>
  </>
));
SheetContent.displayName = "SheetContent";

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

export function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg leading-none font-semibold tracking-tight",
      className,
    )}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

export const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";
