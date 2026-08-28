export function FieldError({
  id,
  message,
  translate,
}: Readonly<{
  id?: string;
  message?: string;
  translate?: (key: string) => string;
}>) {
  if (!message) return null;

  let text = message;
  // i18n keys are dot-paths without spaces (e.g. "validation.emailRequired").
  // If `message` contains spaces, it is already a translated string or server error message.
  if (translate && !message.includes(" ")) {
    try {
      text = translate(message);
    } catch {
      text = message;
    }
  }

  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {text}
    </p>
  );
}
