"use client";

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSafeSession } from '@/lib/supabaseSession';
import Layout from '@/app/components/Layout';
import NiskBuildLogo from '@/app/components/NiskBuildLogo';
import { complexityLabel, formatTemplatePrice, PRICE_TIER_BUCKETS, matchesPriceTier, type PriceTierId } from '@/lib/marketplace-types';

interface Template {
  id: string;
  name: string;
  description: string;
  prompt: string;
  price: number;
  complexity: number;
  downloads: number;
  author: string;
  category: string;
  owned?: boolean;
  listingType?: string;
  source?: string;
  sourceLayer?: string;
}

interface PurchaseRow {
  id: string;
  purchasedAt: string;
  listing: Template;
}

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'ecommerce', label: 'Ecommerce' },
  { value: 'crm', label: 'CRM' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'education', label: 'Education' },
  { value: 'firstparty', label: 'NiskBuild Originals' },
];

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'browse' | 'purchases'>('browse');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'originals' | 'community' | 'templates'>('all');
  const [priceTier, setPriceTier] = useState<PriceTierId>('all');

  useEffect(() => {
    getSafeSession().then((s) => setUser(s?.user ?? null));
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== 'all') params.append('category', category);
    if (search) params.append('search', search);

    const response = await fetch(`/api/marketplace/listings?${params.toString()}`);
    const data = await response.json();
    setTemplates(data.templates || []);
    setLoading(false);
  }, [category, search]);

  const fetchPurchases = useCallback(async () => {
    if (!user) {
      setPurchases([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/marketplace/my-purchases');
      if (response.ok) {
        const data = await response.json();
        setPurchases(data.purchases || []);
      }
    } catch {
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (tab === 'browse') {
      fetchTemplates();
    } else {
      fetchPurchases();
    }
  }, [tab, fetchTemplates, fetchPurchases]);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const purchased = searchParams.get('purchased');
    if (sessionId && purchased) {
      fetch('/api/marketplace/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            setToast('Template unlocked! Click Use Template to open in Builder.');
            setTab('purchases');
            fetchPurchases();
            window.history.replaceState({}, '', '/marketplace');
          }
        })
        .catch(() => {});
    }
    if (searchParams.get('canceled') === 'true') {
      setToast('Purchase canceled.');
      window.history.replaceState({}, '', '/marketplace');
    }
  }, [searchParams, fetchPurchases]);

  const useTemplate = (template: Template) => {
    localStorage.setItem('niskbuild_template_prompt', template.prompt);
    window.location.href = '/builder';
  };

  const handleAction = async (template: Template) => {
    if (template.owned || template.price === 0) {
      useTemplate(template);
      return;
    }

    if (!user) {
      window.location.href = `/login?next=/marketplace`;
      return;
    }

    setPurchasingId(template.id);
    try {
      const res = await fetch('/api/marketplace/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id }),
      });
      const data = await res.json();

      if (data.alreadyOwned) {
        useTemplate(template);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setToast(data.error || 'Checkout failed');
      }
    } catch {
      setToast('Failed to start checkout');
    } finally {
      setPurchasingId(null);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (!matchesPriceTier(t.price, priceTier)) return false;
    if (catalogFilter === 'all') return true;
    if (catalogFilter === 'originals') return t.sourceLayer === 'firstparty';
    if (catalogFilter === 'community') return t.sourceLayer === 'subscriber';
    if (catalogFilter === 'templates') return t.listingType === 'template' || !t.listingType;
    return true;
  });

  const renderTemplateCard = (template: Template, showOwnedBadge = true) => {
    const owned = template.owned || template.price === 0;
    return (
      <div
        key={template.id}
        className="bg-nisk-card rounded-2xl border border-nisk p-6 hover:border-[var(--copper-primary)]/50 transition-all card-hover flex flex-col"
      >
        <Link href={`/marketplace/${template.id}`} className="flex-1 flex flex-col">
          <div className="flex justify-between items-start gap-2 mb-2">
            <h3 className="text-lg font-semibold text-[var(--foreground)] leading-tight hover:text-[var(--copper-melt)]">
              {template.name}
            </h3>
          <span
            className={`shrink-0 text-sm font-bold px-2 py-0.5 rounded-lg ${
              template.price === 0
                ? 'bg-[var(--copper-primary)]/15 text-[var(--copper-melt)]'
                : 'bg-[var(--primary)]/15 text-[var(--primary)]'
            }`}
          >
            {formatTemplatePrice(template.price)}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-nisk-surface text-nisk-muted border border-nisk">
            {complexityLabel(template.complexity as 1)}
          </span>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-nisk-surface text-nisk-muted border border-nisk capitalize">
            {template.category}
          </span>
          {template.sourceLayer === 'firstparty' && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--copper-primary)]/10 text-[var(--copper-melt)] border border-[var(--copper-primary)]/25">
              NiskBuild original
            </span>
          )}
          {template.sourceLayer === 'subscriber' && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-nisk-surface text-nisk-muted border border-nisk">
              Community
            </span>
          )}
          {template.listingType === 'ready_made' && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--ember)]/10 text-[var(--copper-melt)] border border-[var(--copper-primary)]/25">
              Ready-made
            </span>
          )}
          {showOwnedBadge && owned && template.price > 0 && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--copper-primary)]/10 text-[var(--copper-melt)] border border-[var(--copper-primary)]/25">
              Owned
            </span>
          )}
        </div>

        <p className="text-nisk-muted text-sm mb-4 flex-1">{template.description}</p>

        <div className="flex justify-between items-center text-xs text-nisk-muted mb-4">
          <span>{template.author}</span>
          <span>{template.downloads.toLocaleString()} uses</span>
        </div>
        </Link>

        <button
          type="button"
          onClick={() => handleAction(template)}
          disabled={purchasingId === template.id}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
            owned ? 'btn-primary' : 'btn-secondary'
          }`}
        >
          {purchasingId === template.id
            ? 'Redirecting...'
            : owned
              ? 'Use Template →'
              : `Buy for $${template.price}`}
        </button>
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <NiskBuildLogo variant="lockup" size="md" />
          <h1 className="text-3xl font-bold text-gradient-brand mt-6 mb-2">Template Marketplace</h1>
          <p className="text-center text-nisk-muted max-w-xl">
            Browse live listings from the NiskBuild marketplace — templates, ready-made apps, and community builds.
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => setTab('browse')}
            className={`px-5 py-2 rounded-xl text-sm font-semibold border transition-all ${
              tab === 'browse'
                ? 'border-[var(--copper-primary)] bg-[var(--copper-primary)]/15 text-[var(--copper-melt)]'
                : 'border-nisk text-nisk-muted hover:border-[var(--copper-primary)]/40'
            }`}
          >
            Browse
          </button>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                window.location.href = '/login?next=/marketplace';
                return;
              }
              setTab('purchases');
            }}
            className={`px-5 py-2 rounded-xl text-sm font-semibold border transition-all ${
              tab === 'purchases'
                ? 'border-[var(--copper-primary)] bg-[var(--copper-primary)]/15 text-[var(--copper-melt)]'
                : 'border-nisk text-nisk-muted hover:border-[var(--copper-primary)]/40'
            }`}
          >
            My Purchases
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-8">
          {PRICE_TIER_BUCKETS.map((tier) => {
            const selected = priceTier === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setPriceTier((current) => (current === tier.id ? 'all' : tier.id))}
                className={`text-center py-3 px-2 rounded-xl border bg-nisk-card transition-all ${
                  selected
                    ? 'border-[var(--copper-primary)] bg-[var(--copper-primary)]/15 shadow-[3px_3px_0_var(--copper-glow)] ring-1 ring-[var(--copper-primary)]/25'
                    : tier.color
                }`}
              >
                <p className={`text-sm font-bold ${selected ? 'text-[var(--copper-melt)]' : ''}`}>
                  {tier.label}
                </p>
                <p className={`text-[10px] mt-0.5 ${selected ? 'text-[var(--copper-melt)]/80' : 'text-nisk-muted'}`}>
                  {tier.range}
                </p>
              </button>
            );
          })}
        </div>

        {toast && (
          <div className="mb-6 p-3 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--copper-melt)] text-sm text-center">
            {toast}
            <button type="button" className="ml-2 underline" onClick={() => setToast(null)}>
              dismiss
            </button>
          </div>
        )}

        {tab === 'browse' && (
          <>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'originals', label: 'NiskBuild originals' },
                { id: 'community', label: 'Community' },
                { id: 'templates', label: 'Templates' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setCatalogFilter(f.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  catalogFilter === f.id
                    ? 'border-[var(--copper-primary)] bg-[var(--copper-primary)]/15 text-[var(--copper-melt)]'
                    : 'border-nisk text-nisk-muted hover:border-[var(--copper-primary)]/40'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-nisk-card border border-nisk rounded-xl p-3 text-[var(--foreground)] placeholder-gray-500 focus:outline-none focus:border-[var(--copper-primary)]"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-nisk-card border border-nisk rounded-xl p-3 text-[var(--foreground)] focus:outline-none focus:border-[var(--copper-primary)]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          </>
        )}

        {loading ? (
          <div className="text-center text-nisk-muted py-12">Loading…</div>
        ) : tab === 'purchases' ? (
          purchases.length === 0 ? (
            <div className="text-center text-nisk-muted py-12">
              <p className="text-xl mb-2">No purchases yet</p>
              <p className="text-sm">
                Browse templates and unlock premium builds, or{' '}
                <button type="button" className="text-[var(--copper-melt)] underline" onClick={() => setTab('browse')}>
                  view the catalog
                </button>
                .
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchases.map((row) => renderTemplateCard({ ...row.listing, owned: true }, false))}
            </div>
          )
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center text-nisk-muted py-12">
            <p className="text-xl mb-2">No listings available</p>
            <p className="text-sm">Check back soon or try a different filter.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => renderTemplateCard(template))}
          </div>
        )}

        <p className="text-center text-sm text-nisk-muted mt-10">
          Agency, Scale, White-Label, Team Enterprise &amp; Sovereign plans include all marketplace templates.{' '}
          <Link href="/pricing" className="text-[var(--copper-melt)] hover:underline">
            Compare plans →
          </Link>
        </p>
      </div>
    </Layout>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <Layout>
          <div className="text-center text-nisk-muted py-12">Loading marketplace…</div>
        </Layout>
      }
    >
      <MarketplaceContent />
    </Suspense>
  );
}
