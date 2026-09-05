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
