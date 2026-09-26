'use client';

import Link from 'next/link';

const SIGNUP_HREF = '/signup';

type PlanCta = {
  name: string;
  cta: string;
  highlight?: boolean;
  /** signup | billing | family | contact */
  action: 'signup' | 'billing' | 'family' | 'contact';
};

/**
 * Trial-first UX (landing is always on supereduc8.com):
 * - Free / Free Trial → /signup (starts 14-day app trial, no card)
 * - Student / Multi-curriculum → /billing (login if needed, then Subscribe → Stripe)
 * - Family additional child → /billing?plan=family (quantity on billing page)
 * - Teacher/School → contact anchor
 */
export default function SuperEduc8PricingCta({ plan }: { plan: PlanCta }) {
  if (plan.action === 'contact') {
    return (
      <a
        href="#contact"
        className={
          plan.highlight ? 'se8-btn se8-btn-primary se8-btn-sm' : 'se8-btn se8-btn-ghost se8-btn-sm'
        }
      >
        {plan.cta}
      </a>
    );
  }

  if (plan.action === 'signup') {
    return (
      <Link
        href={SIGNUP_HREF}
        className={
          plan.highlight ? 'se8-btn se8-btn-primary se8-btn-sm' : 'se8-btn se8-btn-ghost se8-btn-sm'
        }
      >
        {plan.cta}
      </Link>
    );
  }

  const href =
    plan.action === 'family' ? '/billing?plan=family&children=1' : '/billing';

  return (
    <Link
      href={href}
      className={
        plan.highlight ? 'se8-btn se8-btn-primary se8-btn-sm' : 'se8-btn se8-btn-ghost se8-btn-sm'
      }
      data-testid={
        plan.action === 'family' ? 'se8-pricing-family-cta' : 'se8-pricing-student-cta'
      }
    >
      {plan.cta}
    </Link>
  );
}
