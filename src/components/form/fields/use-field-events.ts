import type { FieldValues, UseFormReturn } from "react-hook-form";

import type { FieldEventHandlers } from "../field-events";
import type { FieldEvents, FormField } from "../types";

export interface UseFieldEventsOptions {
  field: FormField;
  form: UseFormReturn<FieldValues>;
  fieldEventHandlers?: FieldEventHandlers;
}

export function useFieldEvents({
  field,
  form,
  fieldEventHandlers,
}: UseFieldEventsOptions) {
  const triggerEvent = async (eventName: keyof FieldEvents) => {
    const handlerName = field.events?.[eventName];
    if (handlerName && fieldEventHandlers?.[handlerName]) {
      await fieldEventHandlers[handlerName](form.getValues(), {
        formApi: form,
        field,
      });
    }
  };

  const registerWithEvents = () => {
    const registration = form.register(field.name);
    return {
      ...registration,
      onChange: async (event: React.ChangeEvent<HTMLElement>) => {
        await registration.onChange(event);
        await triggerEvent("onChange");
      },
      onBlur: async (event: React.FocusEvent<HTMLElement>) => {
        await registration.onBlur(event);
        await triggerEvent("onBlur");
      },
      onClick: async () => {
        await triggerEvent("onClick");
      },
    };
  };

  return {
    triggerEvent,
    registerWithEvents,
  };
}
