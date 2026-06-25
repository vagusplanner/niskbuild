"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSafeSession } from '@/lib/supabaseSession';
import Layout from '@/app/components/Layout';

interface Project {
  id: string;
  title: string;
  prompt: string;
  generated_code: string;
  created_at: string;
}

interface BillingSummary {
  creditsRemaining: number;
  creditsAllowance: number;
  daysUntilReset: number | null;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function projectIcon(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('game')) return '🎮';
  if (t.includes('shop') || t.includes('store')) return '🛒';
  if (t.includes('dashboard')) return '📊';
  if (t.includes('portfolio')) return '🖼';
  return '⚡';
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [deployedCount, setDeployedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);

  useEffect(() => {
    getSafeSession().then((s) => {
      if (!s?.user) {
        router.replace('/login?next=/dashboard');
        return;
      }
      setUser(s.user);
    });

    Promise.all([
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/billing/summary', { credentials: 'include' }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch('/api/previews', { credentials: 'include' }).then((r) =>
        r.ok ? r.json() : null
      ),
    ])
      .then(([projectsData, billingData, previewsData]) => {
        setProjects(projectsData.projects || []);
        if (billingData) {
          setBilling({
            creditsRemaining: billingData.creditsRemaining ?? 0,
            creditsAllowance: billingData.creditsAllowance ?? 0,
            daysUntilReset: billingData.daysUntilReset ?? null,
          });
        }
        setDeployedCount(previewsData?.active ?? 0);
      })
      .finally(() => setLoading(false));

    if (searchParams.get('success') === 'true') {
      setCheckoutMsg('Payment successful! Your plan is now active.');
    }
  }, [router, searchParams]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[var(--copper-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const generationsUsed = billing
    ? Math.max(0, billing.creditsAllowance - billing.creditsRemaining)
    : 0;
  const generationLimit = billing?.creditsAllowance ?? 0;
  const liveCount = projects.filter((p) => p.generated_code?.trim().length > 100).length;

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Dashboard</h1>
        <p className="text-nisk-muted text-sm mt-1">{user.email}</p>
        {checkoutMsg && (
          <p className="mt-3 text-sm text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-lg px-4 py-2">
            {checkoutMsg}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--code-bg)] p-4">
          <p className="text-[10px] uppercase tracking-wider text-nisk-muted">AI generations</p>
          <p className="text-xl font-bold text-[var(--code-keyword)] mt-1">
            {generationsUsed}
            <span className="text-sm font-normal text-nisk-muted">
              {generationLimit > 0 ? ` / ${generationLimit}` : ''}
            </span>
          </p>
          <p className="text-[10px] text-nisk-muted mt-1">This billing period</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--code-bg)] p-4">
          <p className="text-[10px] uppercase tracking-wider text-nisk-muted">Active projects</p>
          <p className="text-xl font-bold text-[var(--foreground)] mt-1">{projects.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--code-bg)] p-4">
          <p className="text-[10px] uppercase tracking-wider text-nisk-muted">Deployed</p>
          <p className="text-xl font-bold text-[var(--foreground)] mt-1">{deployedCount || liveCount}</p>
          <p className="text-[10px] text-nisk-muted mt-1">Live preview links</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--code-bg)] p-4">
          <p className="text-[10px] uppercase tracking-wider text-nisk-muted">Plan resets</p>
          <p className="text-xl font-bold text-[var(--copper-melt)] mt-1">
            {billing?.daysUntilReset != null ? `${billing.daysUntilReset}d` : '—'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Your projects</h2>
        <Link href="/builder" className="btn-primary px-3 py-1.5 rounded-lg text-xs">
          + New in Builder
        </Link>
      </div>

      {loading ? (
        <p className="text-nisk-muted text-sm">Loading…</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const isLive = project.generated_code?.trim().length > 100;
            return (
              <Link
                key={project.id}
                href="/builder"
                onClick={() => localStorage.setItem('niskbuild_load_project_id', project.id)}
                className="group rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4 hover:border-[var(--copper-primary)]/40 transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{projectIcon(project.title)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--foreground)] truncate group-hover:text-[var(--copper-melt)]">
                      {project.title || 'Untitled'}
                    </p>
                    <p className="text-[10px] text-nisk-muted mt-1">
                      Edited {relativeTime(project.created_at)}
                    </p>
                    <span
                      className={`inline-block mt-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isLive
                          ? 'border-[var(--success)]/40 text-[var(--success)] bg-[var(--success)]/10'
                          : 'border-[var(--border)] text-nisk-muted bg-[var(--code-bg)]'
                      }`}
                    >
                      {isLive ? 'Live' : 'Draft'}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}

          <Link
            href="/marketplace"
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] p-6 text-center hover:border-[var(--copper-primary)]/50 transition-all min-h-[120px]"
          >
            <span className="text-2xl mb-2">🏪</span>
            <p className="text-sm font-medium text-[var(--copper-melt)]">Start from marketplace</p>
            <p className="text-[10px] text-nisk-muted mt-1">Clone a template into your projects</p>
          </Link>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3 text-xs">
        <Link href="/projects" className="text-nisk-muted hover:text-[var(--copper-melt)]">
          All projects →
        </Link>
        <Link href="/deployments" className="text-nisk-muted hover:text-[var(--copper-melt)]">
          Deployments →
        </Link>
        <Link href="/dashboard/settings" className="text-nisk-muted hover:text-[var(--copper-melt)]">
          Settings →
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Layout showFooter={false}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="w-8 h-8 border-4 border-[var(--copper-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </Layout>
  );
}
