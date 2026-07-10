/**
 * Reusable k-anonymity helper for internal demand analytics.
 * Any filtered cohort below the minimum must not expose a raw count.
 */

export const PROMPT_STATS_MIN_COHORT = 20;

export const INSUFFICIENT_DATA = 'insufficient_data' as const;
export type CohortCount = number | typeof INSUFFICIENT_DATA;

export type ThresholdedRow<T> = Omit<T, 'count'> & {
  count: CohortCount;
  suppressed: boolean;
};

/** Mask a single cohort size — below threshold → insufficient_data. */
export function maskCohortCount(
  count: number,
  minThreshold: number = PROMPT_STATS_MIN_COHORT
): CohortCount {
  const n = Number(count) || 0;
  if (n < minThreshold) return INSUFFICIENT_DATA;
  return n;
}

/**
 * Apply threshold to a list of `{ count }` breakdowns.
 * Rows under the floor keep the key dimensions but count is `insufficient_data`.
 */
export function applyCohortThreshold<T extends { count: number }>(
  rows: T[],
  minThreshold: number = PROMPT_STATS_MIN_COHORT
): ThresholdedRow<T>[] {
  return rows.map((row) => {
    const masked = maskCohortCount(row.count, minThreshold);
    return {
      ...row,
      count: masked,
      suppressed: masked === INSUFFICIENT_DATA,
    } as ThresholdedRow<T>;
  });
}

/** True when every row (or the sole aggregate) is under the floor. */
export function isEntirelyInsufficient(
  rows: { count: CohortCount }[],
  minThreshold: number = PROMPT_STATS_MIN_COHORT
): boolean {
  if (rows.length === 0) return true;
  return rows.every((r) => r.count === INSUFFICIENT_DATA || (typeof r.count === 'number' && r.count < minThreshold));
}

export function numericOrZero(count: CohortCount): number {
  return typeof count === 'number' ? count : 0;
}
