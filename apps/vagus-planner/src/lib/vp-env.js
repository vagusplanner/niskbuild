/**
 * Runtime env helpers for Vagus Planner.
 * Defends against Cap builds that accidentally baked wrapping quotes into VITE_* values.
 */

/** Strip whitespace and wrapping single/double quotes (including nested wraps). */
export function stripWrappingQuotes(raw) {
  if (raw == null) return '';
  let s = String(raw).trim();
  while (
    s.length >= 2 &&
    ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/** Baked API origin for NiskBuild VP routes (no trailing slash). */
export function getVpApiBaseUrl() {
  try {
    return stripWrappingQuotes(import.meta.env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
  } catch {
    return '';
  }
}
