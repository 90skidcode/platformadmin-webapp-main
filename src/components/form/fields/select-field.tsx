import { useEffect, useMemo, useRef } from "react";
import { Controller, useWatch } from "react-hook-form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { FieldError } from "./field-error";
import { FieldLabel, resolveText } from "./field-label";
import type { FieldComponentProps } from "./field-types";
import { useRemoteOptions } from "./use-remote-options";

export function SelectField({
  field,
  form,
  translate,
  apiFetcher,
  actionHandlers,
}: Readonly<FieldComponentProps>) {
  const error = form.formState.errors[field.name]?.message as
    | string
    | undefined;
  const placeholder = resolveText(
    translate,
    field.placeholder,
    field.placeholderKey,
  );
  const errorId = `${field.name}-error`;

  const singleParent =
    field.dependsOn ??
    (field.optionsSource?.type === "remote"
      ? field.optionsSource.dependsOn
      : undefined);

  // Extract placeholder names from remote URL e.g. {category}, {state}
  const placeholders = useMemo(() => {
    if (field.optionsSource?.type !== "remote") return [];
    const matches = field.optionsSource.url.match(/\{(\w+)\}/g);
    return matches ? matches.map((m) => m.slice(1, -1)) : [];
  }, [field.optionsSource]);

  const parentName =
    singleParent ?? (placeholders.length === 1 ? placeholders[0] : undefined);
  const isMulti = !parentName && placeholders.length > 1;

  // Targeted useWatch: only subscribes to exact parent field(s), preventing whole-form re-renders
  const watchedSingle = useWatch({
    control: form.control,
    name: parentName ? (parentName as never) : "",
  });

  const watchedMulti = useWatch({
    control: form.control,
    name: placeholders,
  });

  const parentValue = useMemo(() => {
    if (isMulti) {
      return Object.fromEntries(
        placeholders.map((k, i) => [k, watchedMulti?.[i]]),
      );
    }
    return parentName ? watchedSingle : undefined;
  }, [isMulti, placeholders, watchedMulti, parentName, watchedSingle]);

  const parentValueSerialized = useMemo(() => {
    return typeof parentValue === "object" && parentValue !== null
      ? JSON.stringify(parentValue)
      : String(parentValue ?? "");
  }, [parentValue]);

  const parentFieldName = isMulti ? placeholders.join(",") : parentName;

  const prevParentRef = useRef(parentValueSerialized);
  useEffect(() => {
    if (
      parentFieldName &&
      prevParentRef.current !== undefined &&
      prevParentRef.current !== parentValueSerialized
    ) {
      form.setValue(field.name, "");
    }
    prevParentRef.current = parentValueSerialized;
  }, [parentValueSerialized, parentFieldName, field.name, form]);

  const isAwaitingParent =
    !!parentFieldName &&
    (!parentValue ||
      parentValue === "" ||
      (typeof parentValue === "object" &&
        Object.values(parentValue).some((v) => !v)));

  const { options, loading } = useRemoteOptions(
    field.optionsSource,
    apiFetcher,
    parentValue,
  );

  let displayPlaceholder = placeholder;
  if (isAwaitingParent) {
    displayPlaceholder = placeholder ?? "Select parent first...";
  } else if (loading) {
    displayPlaceholder = "Loading options...";
  }

  return (
    <div className="grid gap-1.5">
      <FieldLabel field={field} translate={translate} />
      <Controller
        control={form.control}
        name={field.name}
        render={({ field: controllerField }) => (
          <Select
            value={
              controllerField.value ? String(controllerField.value) : undefined
            }
            onValueChange={(val) => {
              controllerField.onChange(val);
              if (field.onChange && actionHandlers?.[field.onChange]) {
                actionHandlers[field.onChange](
                  {
                    ...form.getValues(),
                    [field.name]: val,
                  },
                  { formApi: form },
                );
              }
            }}
            disabled={field.disabled || isAwaitingParent || loading}
          >
            <SelectTrigger
              id={field.name}
              aria-describedby={error ? errorId : undefined}
              onBlur={() => {
                controllerField.onBlur();
                if (field.onBlur && actionHandlers?.[field.onBlur]) {
                  actionHandlers[field.onBlur](
                    {
                      ...form.getValues(),
                      [field.name]: controllerField.value,
                    },
                    { formApi: form },
                  );
                }
              }}
            >
              <SelectValue placeholder={displayPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {field.clearable && (
                <SelectItem value="">
                  <span className="text-muted-foreground italic">None</span>
                </SelectItem>
              )}
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.labelKey
                    ? translate(option.labelKey)
                    : (option.label ?? option.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}
