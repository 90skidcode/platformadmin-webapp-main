import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, Input } from "@/components/ui";
import { FieldError } from "./field-error";
import { FieldLabel, resolveText } from "./field-label";
import type { FieldComponentProps } from "./field-types";

// Maps a field's `type` to the native <input type>.
const INPUT_TYPE: Record<string, string> = {
  text: "text",
  email: "email",
  // sonarjs's hardcoded-password heuristic flags this key/value pair as if it were a credential -- it's a type-map entry, not a secret.
  // eslint-disable-next-line sonarjs/no-hardcoded-passwords
  password: "password",
  number: "number",
  date: "date",
};

// Keys a number field lets through: digits, a single decimal point, and
// navigation/editing keys. "-", "+", "e"/"E" (sign and exponent notation,
// all natively legal in a number input) are excluded so negative and
// scientific-notation values can't be typed at all.
const NUMBER_FIELD_ALLOWED_KEYS = new Set([
  "Backspace",
  "Delete",
  "Tab",
  "Escape",
  "Enter",
  "Home",
  "End",
  "ArrowLeft",
  "ArrowRight",
  ".",
]);

function isDigitKey(key: string) {
  return key.length === 1 && key >= "0" && key <= "9";
}

export function TextField({
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

  // Any *other* field's handler may have called ctx.setFieldState(this
  // field's name, ...) -- merge that in alongside this field's own state.
  const disabled = field.disabled || !!externalState?.disabled;
  const displayError = error ?? externalState?.error;

  const registered = form.register(field.name);
  const emit = (eventType: string, detail?: string) =>
    onFieldEvent?.(field.name, eventType, detail);
  const isNumberField = field.type === "number";
  const isPasswordField = field.type === "password";
  const [showPassword, setShowPassword] = useState(false);
  // Namespaced separately from `translate` (scoped to the form's own
  // i18nNamespace, e.g. "auth.login") -- the toggle's label is shared
  // across every form, so it lives under "common" like other cross-form
  // strings (see e.g. table-renderer's commonT).
  const commonT = useTranslations("common");

  // field.onKeyUp: a consumer-supplied function (fieldHandlers[name]) that
  // gets this field's live value and can do anything async -- call an API,
  // then use ctx.setFieldState to enable/disable/error any field in the
  // form, itself included. Not `form.watch`-driven: it runs once per
  // keyup, not once per render.
  const keyUpHandler = field.onKeyUp
    ? fieldHandlers?.[field.onKeyUp]
    : undefined;

  // `externalState.hidden`: still registered with react-hook-form (the
  // hook above already ran), just not rendered -- same "part of the form,
  // not part of the page" idea `type: "hidden"` fields always have.
  if (externalState?.hidden) return null;

  return (
    <div className="grid gap-1.5">
      <FieldLabel field={field} translate={translate} />
      <div className="relative">
        <Input
          id={field.name}
          type={
            isPasswordField && showPassword
              ? "text"
              : (INPUT_TYPE[field.type] ?? "text")
          }
          placeholder={placeholder}
          disabled={disabled}
          invalid={!!displayError}
          aria-describedby={displayError ? errorId : undefined}
          className={isPasswordField ? "pe-10" : undefined}
          {...(isNumberField ? { min: 0 } : {})}
          {...registered}
          onChange={async (e) => {
            if (isNumberField) {
              // Keydown blocks typing "-"/"+"/"e"/"E", but a paste or
              // drag-drop bypasses keydown entirely -- strip those out here
              // too so a pasted negative/exponent value can't slip through.
              const sanitized = e.target.value.replace(/[eE+-]/g, "");
              if (sanitized !== e.target.value) e.target.value = sanitized;
            }
            emit("onChange", e.target.value);
            await registered.onChange(e);
          }}
          onBlur={async (e) => {
            emit("onBlur");
            await registered.onBlur(e);
          }}
          onClick={() => emit("onClick")}
          onDoubleClick={() => emit("onDoubleClick")}
          onMouseDown={() => emit("onMouseDown")}
          onMouseUp={() => emit("onMouseUp")}
          onMouseEnter={() => emit("onMouseEnter")}
          onMouseLeave={() => emit("onMouseLeave")}
          onFocus={() => emit("onFocus")}
          onKeyDown={(e) => {
            emit("onKeyDown", e.key);
            if (!isNumberField) return;
            // Block anything that isn't a digit/decimal-point/edit key:
            // "-" and "+" (negative/positive sign), "e"/"E" (exponent
            // notation), and the up/down arrows the browser otherwise uses
            // to increment/decrement the value.
            const blocked =
              e.key === "ArrowUp" ||
              e.key === "ArrowDown" ||
              (!e.ctrlKey &&
                !e.metaKey &&
                !NUMBER_FIELD_ALLOWED_KEYS.has(e.key) &&
                !isDigitKey(e.key));
            if (blocked) e.preventDefault();
          }}
          // A number input still lets the mouse wheel bump the value up/down
          // while focused; blurring on wheel is the standard cross-browser
          // way to stop that (wheel listeners are passive, so
          // preventDefault() alone isn't reliable here).
          onWheel={isNumberField ? (e) => e.currentTarget.blur() : undefined}
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
        {isPasswordField && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="absolute inset-y-0 end-0 size-10 text-muted-foreground hover:bg-transparent hover:text-foreground"
            aria-label={
              showPassword
                ? commonT("actions.hidePassword")
                : commonT("actions.showPassword")
            }
            aria-pressed={showPassword}
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )}
          </Button>
        )}
      </div>
      <FieldError id={errorId} message={displayError} translate={translate} />
    </div>
  );
}
