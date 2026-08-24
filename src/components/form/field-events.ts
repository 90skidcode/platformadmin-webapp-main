import type { FieldValues, UseFormReturn } from "react-hook-form";
import type { FormField } from "./types";

export interface FieldEventContext {
  formApi: UseFormReturn<FieldValues>;
  field: FormField;
}

export type FieldEventHandler = (
  values: FieldValues,
  context: FieldEventContext,
) => void | Promise<void>;

export type FieldEventHandlers = Record<string, FieldEventHandler>;
