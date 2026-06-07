"use client";

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getSafeSession } from '@/lib/supabaseSession';
import Layout from '@/app/components/Layout';
import PricingCards from '@/app/components/PricingCards';
import { PRICING_FAQ } from '@/lib/pricing-tiers';

function PricingContent() {
  const [loading, setLoading] = useState<string | null>(null);
  const [canceled, setCanceled] = useState(false);
  const searchParams = useSearchParams();

  const [needsUpgrade, setNeedsUpgrade] = useState(false);

  useEffect(() => {
    if (searchParams.get('canceled') === 'true') setCanceled(true);
    if (searchParams.get('upgrade') === '1') setNeedsUpgrade(true);
  }, [searchParams]);

  const handleSubscribe = async (tier: string) => {
    setLoading(tier);

    const session = await getSafeSession();
    const user = session?.user;

    if (!user) {
      window.location.href = `/login?next=/pricing`;
      return;
    }

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          tier,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      });

      const { url, error } = await response.json();

      if (error) throw new Error(error);
      if (url) window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-14 relative">
          <div
            className="absolute inset-0 -z-10 opacity-30 blur-3xl"
            style={{
              background: 'radial-gradient(ellipse at center, var(--primary) 0%, transparent 70%)',
            }}
          />
          <p className="text-[var(--primary)] text-sm font-medium uppercase tracking-wider mb-3">Pricing</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-nisk-muted max-w-2xl mx-auto text-lg">
            Start free. Scale when your client work grows. No hidden fees — cancel anytime.
          </p>
        </div>

        {needsUpgrade && (
          <div className="mb-6 p-4 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-sm text-center">
            <p className="text-white font-medium mb-1">Choose a plan to unlock the builder</p>
            <p className="text-nisk-muted">Sign in is complete — upgrade below to access the builder and marketplace.</p>
          </div>
        )}

        {canceled && (
          <div className="mb-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm text-center">
            Checkout was canceled. Pick a plan below when you&apos;re ready.
          </div>
        )}

        <PricingCards variant="page" loadingTier={loading} onSubscribe={handleSubscribe} />

        {/* Trust row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
          {[
            { icon: '📦', title: 'Own your code', desc: 'Export clean ZIP files. Host anywhere.' },
            { icon: '⚡', title: 'Live preview', desc: 'See every change instantly as you build.' },
            { icon: '🔒', title: 'No lock-in', desc: 'Cancel anytime. Your projects stay yours.' },
          ].map((item) => (
            <div key={item.title} className="bg-nisk-card border border-nisk rounded-xl p-5 text-center">
              <div className="text-2xl mb-2">{item.icon}</div>
              <h3 className="font-semibold text-white text-sm mb-1">{item.title}</h3>
              <p className="text-nisk-muted text-xs">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 pt-12 border-t border-nisk">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Frequently asked questions</h2>
          <div className="max-w-3xl mx-auto space-y-3">
            {PRICING_FAQ.map((faq) => (
              <details key={faq.q} className="bg-nisk-card rounded-xl border border-nisk group">
                <summary className="cursor-pointer p-4 font-medium text-white hover:text-[var(--primary)] transition-colors list-none flex justify-between items-center">
                  {faq.q}
                  <span className="text-nisk-muted group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="px-4 pb-4 text-nisk-muted text-sm leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="text-center mt-12 pt-8 border-t border-nisk">
          <p className="text-nisk-muted text-sm mb-4">
            Not signed in yet?{' '}
            <Link href="/login?next=/pricing" className="text-[var(--primary)] hover:underline">
              Create a free account →
            </Link>
          </p>
          <p className="text-nisk-muted text-sm">
            Need a custom plan?{' '}
            <a href="mailto:hello@niskbuild.com" className="text-[var(--primary)] hover:underline">
              Contact us →
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    }>
      <PricingContent />
    </Suspense>
  );
}
