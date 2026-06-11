"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PRICING_TIERS, type PricingTier } from '@/lib/pricing-tiers';
import ContactSalesModal from '@/app/components/ContactSalesModal';

interface PricingCardsProps {
  variant?: 'landing' | 'page';
  loadingTier?: string | null;
  onSubscribe?: (tier: string) => void;
  /** Open contact form for a tier slug, e.g. from /pricing?contact=sovereign */
  initialContactTier?: string | null;
}

function tierButtonClass(tier: PricingTier, variant: 'landing' | 'page') {
  if (variant === 'landing') {
    if (tier.highlighted) return 'bg-[var(--secondary)] hover:bg-[var(--secondary-hover)] text-white';
    if (tier.tier === 'pro') return 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white';
    if (!tier.tier) return 'bg-[var(--surface-elevated)] hover:bg-[var(--border)] text-white border border-nisk';
    return 'bg-[var(--surface-elevated)] hover:border-[var(--primary)] text-white border border-nisk';
  }

  if (!tier.tier) return 'bg-[var(--surface-elevated)] cursor-default text-nisk-muted border border-nisk';
  if (tier.highlighted) return 'bg-[var(--secondary)] hover:bg-[var(--secondary-hover)] text-white';
  if (tier.tier === 'pro') return 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white';
  if (tier.tier === 'scale') return 'bg-emerald-600 hover:bg-emerald-500 text-white';
  return 'bg-amber-600 hover:bg-amber-500 text-white';
}

export default function PricingCards({
  variant = 'page',
  loadingTier,
  onSubscribe,
  initialContactTier,
}: PricingCardsProps) {
  const [contactTier, setContactTier] = useState<PricingTier | null>(null);

  useEffect(() => {
    if (!initialContactTier || variant !== 'page') return;
    const tier = PRICING_TIERS.find((t) => t.tier === initialContactTier && t.contactSales);
    if (tier) setContactTier(tier);
  }, [initialContactTier, variant]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`relative rounded-2xl p-6 transition-all card-hover flex flex-col ${
              tier.highlighted
                ? 'bg-gradient-to-b from-[var(--secondary)]/20 to-nisk-card border-2 border-[var(--secondary)] xl:scale-105 shadow-xl z-10'
                : 'bg-nisk-card border border-nisk hover:border-[var(--primary)]/50'
            }`}
          >
            {tier.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--secondary)] text-white text-xs px-3 py-1 rounded-full whitespace-nowrap">
                MOST POPULAR
              </div>
            )}

            <h3 className="text-lg font-bold text-white mb-1">{tier.name}</h3>
            <p className="text-nisk-muted text-sm mb-4 min-h-[40px]">{tier.description}</p>
            <p className="text-3xl font-bold text-white mb-6">
              {tier.price}
              <span className="text-sm text-nisk-muted">{tier.period}</span>
            </p>

            <ul className="space-y-2 mb-8 text-sm flex-1">
              {tier.features.map((feature) => (
                <li key={feature} className="text-gray-300 flex gap-2">
                  <span className="text-[var(--success)] shrink-0">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            {variant === 'landing' ? (
              <Link
                href={
                  tier.contactSales && tier.tier
                    ? `/pricing?contact=${tier.tier}`
                    : tier.tier
                      ? '/pricing'
                      : '/login'
                }
                className={`w-full py-2.5 rounded-lg font-medium text-center text-sm transition-all ${tierButtonClass(tier, 'landing')}`}
              >
                {tier.tier ? tier.buttonText : 'Get Started Free'}
              </Link>
            ) : tier.contactSales ? (
              <button
                type="button"
                onClick={() => setContactTier(tier)}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${tierButtonClass(tier, 'page')}`}
              >
                {tier.buttonText}
              </button>
          ) : !tier.tier ? (
            <Link
              href="/login?next=/builder"
              className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all text-center block ${tierButtonClass(tier, 'page')}`}
            >
              {tier.buttonText}
            </Link>
          ) : (
            <button
              onClick={() => tier.tier && onSubscribe?.(tier.tier)}
              disabled={loadingTier === tier.tier}
              className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-50 ${tierButtonClass(tier, 'page')}`}
            >
              {loadingTier === tier.tier ? 'Processing...' : tier.buttonText}
            </button>
          )}
          </div>
        ))}
      </div>

      <ContactSalesModal tier={contactTier} onClose={() => setContactTier(null)} />
    </>
  );
}
