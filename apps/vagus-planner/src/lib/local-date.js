/**
 * Local-calendar date helpers.
 * Avoid `toISOString().split('T')[0]` / `new Date('yyyy-MM-dd')` for "today"
 * comparisons — those are UTC and shift the calendar day for UTC+ users.
 */

/** @param {Date} [d] */
export function localDateString(d = new Date()) {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Parse a date-only `yyyy-MM-dd` as local midnight (not UTC midnight).
 * @param {string} ymd
 * @returns {Date}
 */
export function parseLocalDateOnly(ymd) {
  if (ymd == null || ymd === '') return new Date(NaN);
  const s = String(ymd).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) {
    const d = new Date(s);
    return d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
}

/**
 * Build a local Date from `yyyy-MM-dd` + optional `HH:mm` (24h).
 * @param {string} ymd
 * @param {string} [hm]
 * @param {{ hours?: number, minutes?: number, seconds?: number, ms?: number }} [fallback]
 */
export function localDateTimeFromParts(ymd, hm, fallback = {}) {
  const base = parseLocalDateOnly(ymd);
  if (Number.isNaN(base.getTime())) return base;
  if (typeof hm === 'string' && /^\d{1,2}:\d{2}/.test(hm.trim())) {
    const [h, min] = hm.trim().split(':');
    base.setHours(parseInt(h, 10), parseInt(min, 10), fallback.seconds ?? 0, fallback.ms ?? 0);
    return base;
  }
  base.setHours(
    fallback.hours ?? 0,
    fallback.minutes ?? 0,
    fallback.seconds ?? 0,
    fallback.ms ?? 0
  );
  return base;
}

/** Inclusive local-day ISO bounds for timestamptz filters. */
export function localDayBoundsIso(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return {
    dateStr: localDateString(d),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

/** Local calendar month bounds as date-only strings + ISO. */
export function localMonthBounds(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return {
    startDateStr: localDateString(start),
    endDateStr: localDateString(end),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

/**
 * Prefer the YYYY-MM-DD prefix from a stored date/timestamptz string so
 * date-only values (midnight UTC) do not shift when read in local TZ.
 * @param {unknown} value
 */
export function toDateOnlyString(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const m = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return localDateString(d);
}
