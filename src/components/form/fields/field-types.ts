import type { FieldValues, UseFormReturn } from "react-hook-form";

import type { ApiFetcher } from "@/lib/fetcher/use-api-fetcher";
import type { FieldEventHandlers } from "../field-events";
import type { FormField } from "../types";

export interface FieldComponentProps {
  field: FormField;
  form: UseFormReturn<FieldValues>;
  translate: (key: string) => string;
  apiFetcher: ApiFetcher;
  fieldEventHandlers?: FieldEventHandlers;
}
