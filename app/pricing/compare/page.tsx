'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { getSafeSession } from '@/lib/supabaseSession';
import Layout from '@/app/components/Layout';
import NiskBuildLogo from '@/app/components/NiskBuildLogo';
import PlanCompareTable from '@/app/components/PlanCompareTable';
import { type BillingInterval } from '@/lib/pricing-tiers';
import { redirectToStripe } from '@/lib/checkout-redirect';

function CompareContent() {
  const [loading, setLoading] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month');

  const handleSubscribe = async (tier: string, interval: BillingInterval) => {
    setLoading(tier);

    const session = await getSafeSession();
    const user = session?.user;

    if (!user) {
      window.location.href = `/login?next=/pricing/compare`;
      return;
    }

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tier,
          interval,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: `${window.location.origin}/pricing/compare?canceled=true`,
        }),
      });

      const data = await response.json();
      const { url, error } = data;

      if (!response.ok || error) {
        throw new Error(error || 'Checkout failed');
      }
      if (url) redirectToStripe(url);
    } catch (error) {
      console.error('Checkout error:', error);
      const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      alert(message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-[1400px] mx-auto">
        <div className="flex justify-center mb-8">
          <NiskBuildLogo href="/landing-v2" variant="lockup" size="md" />
        </div>

        <div className="text-center mb-10 relative">
          <div
            className="absolute inset-0 -z-10 opacity-30 blur-3xl"
            style={{
              background:
                'radial-gradient(ellipse at center, var(--copper-glow) 0%, transparent 70%)',
            }}
          />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--copper-melt)] mb-3">
            Plan comparison
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--nisk-color)] mb-3">
            Every plan, side by side
          </h1>
          <p className="text-nisk-muted max-w-2xl mx-auto text-sm md:text-base">
            Credits, exports, BYOC, and ticket support match what the product enforces today.
            Enterprise roadmap items are labeled Coming soon — not removed from the matrix.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-nisk-card border border-nisk">
            <button
              type="button"
              onClick={() => setBillingInterval('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingInterval === 'month'
                  ? 'bg-[var(--copper-primary)] text-white'
                  : 'text-nisk-muted hover:text-[var(--nisk-color)]'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval('year')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingInterval === 'year'
                  ? 'bg-[var(--copper-primary)] text-white'
                  : 'text-nisk-muted hover:text-[var(--nisk-color)]'
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs opacity-80">Save 2 months</span>
            </button>
          </div>
          <Link
            href="/pricing"
            className="text-sm text-[var(--copper-melt)] hover:text-[var(--copper-light)] underline-offset-4 hover:underline"
          >
            Card view & FAQ →
          </Link>
        </div>

        <PlanCompareTable
          billingInterval={billingInterval}
          loadingTier={loading}
          onSubscribe={handleSubscribe}
        />

        <p className="text-center text-nisk-muted text-xs mt-8 max-w-xl mx-auto">
          Scroll horizontally on smaller screens to see all tiers. Prefer cards?{' '}
          <Link href="/pricing" className="text-[var(--copper-melt)] hover:underline">
            Open pricing
          </Link>
          .
        </p>
      </div>
    </Layout>
  );
}

export default function PricingComparePage() {
  return (
    <Suspense
      fallback={
        <Layout>
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="w-8 h-8 border-4 border-[var(--copper-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        </Layout>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
