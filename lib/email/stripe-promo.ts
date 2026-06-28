import 'server-only';

import Stripe from 'stripe';

const WINBACK_DISCOUNT_PERCENT = 20;

export async function createWinbackPromoCode(userId: string): Promise<string | null> {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey) return null;

  try {
    const stripe = new Stripe(stripeKey);
    const coupon = await stripe.coupons.create({
      percent_off: WINBACK_DISCOUNT_PERCENT,
      duration: 'once',
      max_redemptions: 1,
      name: `NiskBuild win-back ${WINBACK_DISCOUNT_PERCENT}%`,
      metadata: { userId, source: 'winback_30d' },
    });

    const promo = await stripe.promotionCodes.create({
      promotion: { coupon: coupon.id, type: 'coupon' },
      max_redemptions: 1,
      metadata: { userId, source: 'winback_30d' },
    });

    return promo.code ?? null;
  } catch (err) {
    console.error('createWinbackPromoCode:', err);
    return null;
  }
}

export function winbackDiscountPercent(): number {
  return WINBACK_DISCOUNT_PERCENT;
}
