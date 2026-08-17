"use client";

import { useTranslations } from "next-intl";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui";
import { resolveText } from "../form/fields/field-label";

interface ConfirmConfig {
  title?: string;
  titleKey?: string;
  message?: string;
  messageKey?: string;
}

export interface ConfirmActionDialogProps {
  /** The pending action awaiting confirmation, or `null` when closed. */
  pending: { confirm?: ConfirmConfig } | null;
  onCancel: () => void;
  onConfirm: () => void;
  translate: (key: string) => string;
}

/** Shared by RowActionsCell and BulkActionsBar -- both need the exact same
 * confirm-before-running-an-action dialog, just fed a different `pending`
 * action. */
export function ConfirmActionDialog({
  pending,
  onCancel,
  onConfirm,
  translate,
}: Readonly<ConfirmActionDialogProps>) {
  const commonT = useTranslations("common");

  return (
    <AlertDialog open={!!pending} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {resolveText(
              translate,
              pending?.confirm?.title,
              pending?.confirm?.titleKey,
            ) ?? ""}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {resolveText(
              translate,
              pending?.confirm?.message,
              pending?.confirm?.messageKey,
            ) ?? ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{commonT("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {commonT("actions.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
