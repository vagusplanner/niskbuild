/**
 * SuperEduc8 Stripe price IDs (shared NiskBuild Stripe account).
 * Prefer env vars; fall back to the live test/prod IDs created for SE8.
 */

export const SE8_STRIPE_PRICE_IDS = {
  studentMonthly:
    process.env.NEXT_PUBLIC_STRIPE_SE8_STUDENT_MONTHLY?.trim() ||
    'price_1UJy5tDffiW7Xraej9AdDKcd',
  studentAnnual:
    process.env.NEXT_PUBLIC_STRIPE_SE8_STUDENT_ANNUAL?.trim() ||
    'price_1UJy5tDffiW7XraeNrBIpHzV',
  childMonthly:
    process.env.NEXT_PUBLIC_STRIPE_SE8_CHILD_MONTHLY?.trim() ||
    'price_1UJyBlDffiW7XraeqOqgW8Q1',
  childAnnual:
    process.env.NEXT_PUBLIC_STRIPE_SE8_CHILD_ANNUAL?.trim() ||
    'price_1UJyBlDffiW7XraeyliuZXdq',
} as const;

export const SE8_MULTI_CURRICULUM_COUPON_ID =
  process.env.SE8_MULTI_CURRICULUM_COUPON_ID?.trim() || '8R1IaLiN';

/** All SE8 recurring price IDs — used for webhook product detection. */
export const SUPEREDUC8_STRIPE_PRICE_IDS = new Set<string>([
  SE8_STRIPE_PRICE_IDS.studentMonthly,
  SE8_STRIPE_PRICE_IDS.studentAnnual,
  SE8_STRIPE_PRICE_IDS.childMonthly,
  SE8_STRIPE_PRICE_IDS.childAnnual,
]);

export type Se8BillingInterval = 'month' | 'year';
export type Se8PlanId = 'student' | 'family';

export function resolveSe8StudentPriceId(interval: Se8BillingInterval): string {
  return interval === 'year'
    ? SE8_STRIPE_PRICE_IDS.studentAnnual
    : SE8_STRIPE_PRICE_IDS.studentMonthly;
}

export function resolveSe8ChildPriceId(interval: Se8BillingInterval): string {
  return interval === 'year'
    ? SE8_STRIPE_PRICE_IDS.childAnnual
    : SE8_STRIPE_PRICE_IDS.childMonthly;
}

export function normalizeSe8Interval(raw: unknown): Se8BillingInterval {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (s === 'year' || s === 'yearly' || s === 'annual' || s === 'annually') {
    return 'year';
  }
  return 'month';
}

export function isSe8StripePriceId(priceId: string | null | undefined): boolean {
  return Boolean(priceId && SUPEREDUC8_STRIPE_PRICE_IDS.has(priceId));
}
