/**
 * Client-safe credit label helpers (billing + builder UI).
 * Remaining can exceed the tier monthly/trial pool after reload packs or grants.
 */

export function formatCreditsRatio(
  remaining: number,
  allowance: number
): string {
  if (allowance <= 0) return `${remaining}`;
  // Never show nonsensical "11 / 5" — when balance exceeds the pool, show balance only.
  if (remaining > allowance) return `${remaining}`;
  return `${remaining} / ${allowance}`;
}

export function formatCreditsRemainingLabel(
  remaining: number,
  allowance: number
): string {
  if (allowance <= 0) return `${remaining} credits`;
  if (remaining > allowance) return `${remaining} credits`;
  return `${remaining} / ${allowance} credits`;
}

/** Progress bar width — use effective pool so remaining > allowance still reads as full. */
export function creditsBarPercent(remaining: number, allowance: number): number {
  const denom = Math.max(allowance, remaining, 1);
  return Math.min(100, Math.round((remaining / denom) * 100));
}
