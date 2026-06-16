"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSafeSession } from '@/lib/supabaseSession';
import Layout from '@/app/components/Layout';
import NiskBuildLogo from '@/app/components/NiskBuildLogo';
import { complexityLabel, formatTemplatePrice } from '@/lib/marketplace-templates';

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
];

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getSafeSession().then((s) => setUser(s?.user ?? null));
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [category, search]);

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
            fetchTemplates();
            window.history.replaceState({}, '', '/marketplace');
          }
        })
        .catch(() => {});
    }
    if (searchParams.get('canceled') === 'true') {
      setToast('Purchase canceled.');
      window.history.replaceState({}, '', '/marketplace');
    }
  }, [searchParams]);

  const fetchTemplates = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== 'all') params.append('category', category);
    if (search) params.append('search', search);

    const response = await fetch(`/api/marketplace?${params.toString()}`);
    const data = await response.json();
    setTemplates(data.templates || []);
    setLoading(false);
  };

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

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <NiskBuildLogo variant="lockup" size="md" />
          <h1 className="text-3xl font-bold text-white mt-6 mb-2">Template Marketplace</h1>
          <p className="text-center text-nisk-muted max-w-xl">
            2 free starter templates · Premium builds from $9 · Full enterprise suites up to $49.
            Agency plans include everything.
          </p>
        </div>

        {/* Price ladder */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-8">
          {[
            { label: 'Free', range: '2 starters', color: 'text-emerald-400 border-emerald-500/30' },
            { label: '$9–$19', range: 'Essential', color: 'text-[var(--accent-cyan)] border-[var(--accent-cyan)]/30' },
            { label: '$25–$29', range: 'Pro', color: 'text-[var(--primary)] border-[var(--primary)]/30' },
            { label: '$35–$42', range: 'Advanced', color: 'text-[var(--secondary)] border-[var(--secondary)]/30' },
            { label: '$49', range: 'Enterprise', color: 'text-amber-400 border-amber-500/30' },
          ].map((tier) => (
            <div
              key={tier.label}
              className={`text-center py-3 px-2 rounded-xl border bg-nisk-card ${tier.color}`}
            >
              <p className="text-sm font-bold">{tier.label}</p>
              <p className="text-[10px] text-nisk-muted mt-0.5">{tier.range}</p>
            </div>
          ))}
        </div>

        {toast && (
          <div className="mb-6 p-3 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)] text-sm text-center">
            {toast}
            <button type="button" className="ml-2 underline" onClick={() => setToast(null)}>
              dismiss
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-nisk-card border border-nisk rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--accent-cyan)]"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-nisk-card border border-nisk rounded-xl p-3 text-white focus:outline-none focus:border-[var(--accent-cyan)]"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center text-nisk-muted py-12">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center text-nisk-muted py-12">
            <p className="text-xl mb-2">No templates found</p>
            <p className="text-sm">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => {
              const owned = template.owned || template.price === 0;
              return (
                <div
                  key={template.id}
                  className="bg-nisk-card rounded-2xl border border-nisk p-6 hover:border-[var(--accent-cyan)]/50 transition-all card-hover flex flex-col"
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white leading-tight">{template.name}</h3>
                    <span
                      className={`shrink-0 text-sm font-bold px-2 py-0.5 rounded-lg ${
                        template.price === 0
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-[var(--primary)]/15 text-[var(--primary)]'
                      }`}
                    >
                      {formatTemplatePrice(template.price)}
                    </span>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-nisk-surface text-nisk-muted border border-nisk">
                      {complexityLabel(template.complexity as 1)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-nisk-surface text-nisk-muted border border-nisk capitalize">
                      {template.category}
                    </span>
                    {owned && template.price > 0 && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Owned
                      </span>
                    )}
                  </div>

                  <p className="text-gray-400 text-sm mb-4 flex-1">{template.description}</p>

                  <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                    <span>{template.author}</span>
                    <span>{template.downloads.toLocaleString()} uses</span>
                  </div>

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
            })}
          </div>
        )}

        <p className="text-center text-sm text-nisk-muted mt-10">
          Agency, Scale, White-Label, Team Enterprise &amp; Sovereign plans include all marketplace templates.{' '}
          <Link href="/pricing" className="text-[var(--accent-cyan)] hover:underline">
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
          <div className="text-center text-nisk-muted py-12">Loading marketplace...</div>
        </Layout>
      }
    >
      <MarketplaceContent />
    </Suspense>
  );
}
