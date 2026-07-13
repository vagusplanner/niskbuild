/**
 * Shared age-gate helpers for NiskBuild signup (minimum age 13, matching Terms/Privacy).
 * [LEGAL REVIEW NEEDED] Confirm threshold and whether DOB may be stored vs verified-only.
 */

export const NISK_MINIMUM_AGE = 13;

export function ageFromDateOfBirth(dobIso: string, asOf: Date = new Date()): number | null {
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;
  let age = asOf.getFullYear() - dob.getFullYear();
  const m = asOf.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < dob.getDate())) age -= 1;
  if (age < 0 || age > 130) return null;
  return age;
}

export function meetsMinimumAge(dobIso: string, minimum = NISK_MINIMUM_AGE): boolean {
  const age = ageFromDateOfBirth(dobIso);
  return age !== null && age >= minimum;
}
