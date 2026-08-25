/** Substitutes `{key}` placeholders (e.g. `/employees/{id}/edit`, `/users/{id}`)
 * with values from the row -- used by row action `target`/`endpoint.url`. */
export function interpolateRow(
  template: string,
  row: Record<string, unknown>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in row ? String(row[key]) : match,
  );
}
