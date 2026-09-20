export const SHIFT_CURRICULA = [
  { value: 'uk', label: 'United Kingdom' },
  { value: 'france', label: 'France' },
  { value: 'usa', label: 'United States' },
  { value: 'saudi', label: 'Saudi Arabia' },
]

export const SHIFT_AGE_RANGES = [
  { value: '7_8', label: 'Ages 7–8' },
  { value: '9_10', label: 'Ages 9–10' },
  { value: '11_12', label: 'Ages 11–12' },
  { value: '13', label: 'Age 13' },
  { value: '14_15', label: 'Ages 14–15' },
  { value: '16', label: 'Age 16' },
  { value: '17', label: 'Age 17' },
]

/** Self-serve Cap SPA signup — under-13 must use web supervised/family consent. */
export const SHIFT_SELF_SERVE_AGE_RANGES = SHIFT_AGE_RANGES.filter(
  (a) => a.value !== '7_8' && a.value !== '9_10' && a.value !== '11_12'
)

export function parseFavouriteSubjects(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, 3)
}

/** Client-side mirror of lib/shift-ai/onboarding needsSubjectOnboarding. */
export function needsSubjectOnboarding(student) {
  if (!student) return true
  return parseFavouriteSubjects(student.favouriteSubjects ?? student.favourite_subjects).length === 0
}
