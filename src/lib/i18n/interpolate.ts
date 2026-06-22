/**
 * Replace {placeholders} in a translation string with provided values.
 * Example: interpolate("متبقٍ {days} يوم", { days: 3 }) => "متبقٍ 3 يوم"
 */
export function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}
