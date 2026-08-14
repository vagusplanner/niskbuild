export const SHIFT_CURRICULA = ['uk', 'france', 'usa', 'saudi'] as const;
export type ShiftCurriculum = (typeof SHIFT_CURRICULA)[number];

export const SHIFT_CURRICULUM_LABELS: Record<ShiftCurriculum, string> = {
  uk: 'United Kingdom',
  france: 'France',
  usa: 'United States',
  saudi: 'Saudi Arabia',
};

export const SHIFT_CURRICULUM_FLAGS: Record<ShiftCurriculum, string> = {
  uk: '🇬🇧',
  france: '🇫🇷',
  usa: '🇺🇸',
  saudi: '🇸🇦',
};

export const SHIFT_AGE_RANGES = [
  '7_8',
  '9_10',
  '11_12',
  '13',
  '14_15',
  '16',
  '17',
] as const;

export type ShiftAgeRange = (typeof SHIFT_AGE_RANGES)[number];

export const SHIFT_AGE_RANGE_LABELS: Record<ShiftAgeRange, string> = {
  '7_8': 'Ages 7–8',
  '9_10': 'Ages 9–10',
  '11_12': 'Ages 11–12',
  '13': 'Age 13',
  '14_15': 'Ages 14–15',
  '16': 'Age 16',
  '17': 'Age 17',
};

export const SHIFT_ACCOUNT_TYPES = ['self', 'supervised', 'family'] as const;
export type ShiftAccountType = (typeof SHIFT_ACCOUNT_TYPES)[number];

export function isShiftCurriculum(value: string): value is ShiftCurriculum {
  return (SHIFT_CURRICULA as readonly string[]).includes(value);
}

export function isShiftAgeRange(value: string): value is ShiftAgeRange {
  return (SHIFT_AGE_RANGES as readonly string[]).includes(value);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export const SHIFT_STUDY_LANGUAGES = ['en', 'ar'] as const;
export type ShiftStudyLanguage = (typeof SHIFT_STUDY_LANGUAGES)[number];

export const SHIFT_STUDY_LANGUAGE_LABELS: Record<ShiftStudyLanguage, string> = {
  en: 'English',
  ar: 'Arabic',
};

export function isShiftStudyLanguage(value: string): value is ShiftStudyLanguage {
  return (SHIFT_STUDY_LANGUAGES as readonly string[]).includes(value);
}

export function defaultStudyLanguageForCurriculum(curriculum: string): ShiftStudyLanguage {
  return curriculum === 'saudi' ? 'ar' : 'en';
}

export function parseStudyLanguage(
  value: unknown,
  curriculum?: string | null
): ShiftStudyLanguage {
  if (typeof value === 'string' && isShiftStudyLanguage(value)) {
    return value;
  }
  return defaultStudyLanguageForCurriculum(curriculum ?? 'uk');
}
