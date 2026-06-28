/** Age-range buckets for anonymous analytics — never store exact birthdate or age. */
export const AGE_RANGE_OPTIONS = [
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55+',
  'prefer not to say',
] as const;

export type AgeRangeOption = (typeof AGE_RANGE_OPTIONS)[number];

export const AGE_RANGE_LABELS: Record<AgeRangeOption, string> = {
  '18-24': '18–24',
  '25-34': '25–34',
  '35-44': '35–44',
  '45-54': '45–54',
  '55+': '55+',
  'prefer not to say': 'Prefer not to say',
};

export function normalizeAgeRange(value: string | null | undefined): AgeRangeOption | null {
  if (!value?.trim()) return null;
  const normalized = value.trim().toLowerCase();
  const match = AGE_RANGE_OPTIONS.find((opt) => opt.toLowerCase() === normalized);
  return match ?? null;
}

/** Minimum event volume before town / cross-tab cells are exposed (k-anonymity). */
export const ANALYTICS_MIN_VOLUME = 8;

export function sanitizeTown(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const town = value.trim().slice(0, 80);
  if (town.length < 2) return null;
  return town;
}
