/** Match a `?subject=` query against a student's subject list (case-insensitive). */
export function resolveSubjectQuery(
  options: string[],
  raw: string | null | undefined
): string | null {
  const decoded = (raw ?? '').trim();
  if (!decoded || options.length === 0) return null;
  const lower = decoded.toLowerCase();
  return options.find((opt) => opt.toLowerCase() === lower) ?? null;
}
