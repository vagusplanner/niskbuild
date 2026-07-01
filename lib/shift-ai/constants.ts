export const SHIFT_CURRICULA = ['uk', 'france', 'usa'] as const;
export type ShiftCurriculum = (typeof SHIFT_CURRICULA)[number];

export const SHIFT_CURRICULUM_LABELS: Record<ShiftCurriculum, string> = {
  uk: 'United Kingdom',
  france: 'France',
  usa: 'United States',
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
