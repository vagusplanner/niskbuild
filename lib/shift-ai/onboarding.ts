import 'server-only';

export function parseFavouriteSubjects(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, 3);
}

export function getFavouriteSubjects(
  student: { favourite_subjects?: string[] | null } | null | undefined
): string[] {
  if (!student) return [];
  return parseFavouriteSubjects(student.favourite_subjects);
}

/** True when the student row is missing or favourite subjects were never set. */
export function needsSubjectOnboarding(
  student: { favourite_subjects?: string[] | null } | null | undefined
): boolean {
  if (!student) return true;
  return getFavouriteSubjects(student).length === 0;
}
