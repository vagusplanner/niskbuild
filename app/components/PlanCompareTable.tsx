'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  PRICING_TIERS,
  type BillingInterval,
  type PricingTier,
} from '@/lib/pricing-tiers';
import {
  COMING_SOON_LABEL,
  COMPARE_ROADMAP_NOTE,
  TIER_COMPARE_TAGLINES,
  buildCompareRows,
  type CompareCell,
} from '@/lib/pricing-compare';
import ContactSalesModal from '@/app/components/ContactSalesModal';

function displayPrice(tier: PricingTier, interval: BillingInterval) {
  if (interval === 'year' && tier.annualPrice) {
    return { price: tier.annualPrice, period: tier.annualPeriod || '/year' };
  }
  return { price: tier.price, period: tier.period };
}

function CellValue({ value }: { value: CompareCell }) {
  if (typeof value === 'boolean') {
    return value ? (
      <span className="text-[var(--copper-melt)] font-semibold" aria-label="Included">
        ✓
      </span>
    ) : (
      <span className="text-nisk-muted/50" aria-label="Not included">
        —
      </span>
    );
  }
  if (value === COMING_SOON_LABEL) {
    return (
      <span
        className="inline-block rounded-md border border-[var(--copper-primary)]/35 bg-[var(--copper-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--copper-melt)]"
        aria-label="Coming soon"
      >
        Coming soon
      </span>
    );
  }
  return <span className="text-[var(--nisk-color)] text-sm leading-snug">{value}</span>;
}

interface PlanCompareTableProps {
  billingInterval: BillingInterval;
  loadingTier: string | null;
  onSubscribe: (tier: string, interval: BillingInterval) => void;
}

export default function PlanCompareTable({
  billingInterval,
  loadingTier,
  onSubscribe,
}: PlanCompareTableProps) {
  const [contactTier, setContactTier] = useState<PricingTier | null>(null);
  const tiers = PRICING_TIERS;
  const rows = buildCompareRows(tiers);

  return (
    <>
      <p className="mb-4 max-w-3xl text-xs md:text-sm text-nisk-muted leading-relaxed">
        {COMPARE_ROADMAP_NOTE}
      </p>
      <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <table className="w-full min-w-[1100px] border-collapse text-left">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-20 bg-[var(--iron-dark)] p-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--copper-melt)] border-b border-[var(--border)] min-w-[160px]"
              >
                Feature
              </th>
              {tiers.map((tier) => {
                const { price, period } = displayPrice(tier, billingInterval);
                const tagline = TIER_COMPARE_TAGLINES[tier.name] || tier.description;
                return (
                  <th
                    key={tier.name}
                    scope="col"
                    className={`align-top p-3 border-b min-w-[140px] max-w-[160px] ${
                      tier.highlighted
                        ? 'bg-[var(--copper-glow)] border-[var(--copper-primary)] border-x border-t rounded-t-xl'
                        : 'border-[var(--border)] bg-[var(--card-bg)]/40'
                    }`}
                  >
                    {tier.highlighted && (
                      <span className="inline-block mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--copper-melt)] bg-[var(--iron-mid)] px-2 py-0.5 rounded-full">
                        Most popular
                      </span>
                    )}
                    <div className="text-base font-bold text-[var(--nisk-color)]">{tier.name}</div>
                    <p className="mt-1.5 text-[11px] leading-snug text-nisk-muted font-normal normal-case tracking-normal">
                      {tagline}
                    </p>
                    <p className="mt-3">
                      <span className="text-xl font-bold text-[var(--nisk-color)]">{price}</span>
                      <span className="text-xs text-nisk-muted">{period}</span>
                    </p>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-[var(--border)]/70">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-[var(--iron-dark)] p-3 text-sm font-medium text-[var(--nisk-color)] border-r border-[var(--border)]/50"
                >
                  {row.label}
                </th>
                {row.values.map((value, i) => (
                  <td
                    key={`${row.label}-${tiers[i]?.name}`}
                    className={`p-3 text-center ${
                      tiers[i]?.highlighted ? 'bg-[var(--copper-glow)]/50' : ''
                    }`}
                  >
                    <CellValue value={value} />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th
                scope="row"
                className="sticky left-0 z-10 bg-[var(--iron-dark)] p-3 text-sm font-medium text-[var(--nisk-color)] border-r border-[var(--border)]/50"
              >
                Get started
              </th>
              {tiers.map((tier) => (
                <td
                  key={`cta-${tier.name}`}
                  className={`p-3 align-top ${
                    tier.highlighted ? 'bg-[var(--copper-glow)]/50 rounded-b-xl' : ''
                  }`}
                >
                  {tier.contactSales ? (
                    <button
                      type="button"
                      onClick={() => setContactTier(tier)}
                      className="w-full py-2 px-2 rounded-xl text-xs font-semibold btn-primary"
                    >
                      {tier.buttonText}
                    </button>
                  ) : !tier.tier ? (
                    <Link
                      href="/login?next=/builder"
                      className="block w-full py-2 px-2 rounded-xl text-xs font-semibold text-center btn-secondary"
                    >
                      {tier.buttonText}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSubscribe(tier.tier!, billingInterval)}
                      disabled={loadingTier === tier.tier}
                      className={`w-full py-2 px-2 rounded-xl text-xs font-semibold disabled:opacity-50 ${
                        tier.highlighted ? 'btn-primary' : 'btn-secondary'
                      }`}
                    >
                      {loadingTier === tier.tier ? 'Processing…' : tier.buttonText}
                    </button>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <ContactSalesModal tier={contactTier} onClose={() => setContactTier(null)} />
    </>
  );
}
