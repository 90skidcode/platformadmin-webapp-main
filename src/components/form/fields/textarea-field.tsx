import { Textarea } from "@/components/ui";
import { FieldError } from "./field-error";
import { FieldLabel, resolveText } from "./field-label";
import type { FieldComponentProps } from "./field-types";

export function TextareaField({
  field,
  form,
  translate,
  apiFetcher,
  onFieldEvent,
  fieldHandlers,
  externalState,
  setFieldState,
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
  const registered = form.register(field.name);
  const emit = (eventType: string, detail?: string) =>
    onFieldEvent?.(field.name, eventType, detail);

  // Same standard as TextField: field.onKeyUp resolves against
  // fieldHandlers, and any *other* field's handler may have called
  // ctx.setFieldState(this field's name, ...) -- merge that in alongside
  // this field's own local disabled/error.
  const disabled = field.disabled || !!externalState?.disabled;
  const displayError = error ?? externalState?.error;
  const keyUpHandler = field.onKeyUp
    ? fieldHandlers?.[field.onKeyUp]
    : undefined;

  if (externalState?.hidden) return null;

  return (
    <div className="grid gap-1.5">
      <FieldLabel field={field} translate={translate} />
      <Textarea
        id={field.name}
        placeholder={placeholder}
        disabled={disabled}
        invalid={!!displayError}
        aria-describedby={displayError ? errorId : undefined}
        {...registered}
        onChange={async (e) => {
          emit("onChange", e.target.value);
          await registered.onChange(e);
        }}
        onBlur={async (e) => {
          emit("onBlur");
          await registered.onBlur(e);
        }}
        // Same standard as TextField -- a real <textarea>, same full
        // text-content event surface.
        onClick={() => emit("onClick")}
        onDoubleClick={() => emit("onDoubleClick")}
        onMouseDown={() => emit("onMouseDown")}
        onMouseUp={() => emit("onMouseUp")}
        onMouseEnter={() => emit("onMouseEnter")}
        onMouseLeave={() => emit("onMouseLeave")}
        onFocus={() => emit("onFocus")}
        onKeyDown={(e) => emit("onKeyDown", e.key)}
        onKeyUp={(e) => {
          emit("onKeyUp", e.key);
          if (keyUpHandler && setFieldState) {
            keyUpHandler(e.currentTarget.value, {
              setFieldState,
              getValues: () => form.getValues(),
              apiFetcher,
            });
          }
        }}
        onInput={() => emit("onInput")}
        onPaste={() => emit("onPaste")}
        onCopy={() => emit("onCopy")}
        onCut={() => emit("onCut")}
        onContextMenu={() => emit("onContextMenu")}
        onSelect={() => emit("onSelect")}
      />
      <FieldError id={errorId} message={displayError} />
    </div>
  );
}
