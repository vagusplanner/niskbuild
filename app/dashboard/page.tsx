"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSafeSession } from '@/lib/supabaseSession';
import Layout from '@/app/components/Layout';
import NiskBuildLogo from '@/app/components/NiskBuildLogo';
import ProjectLimitBadge from '@/app/components/ProjectLimitBadge';
import PreviewLinksStatus from '@/app/components/PreviewLinksStatus';
import { MAIN_NAV } from '@/lib/nav-config';

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);
  const [previewRestoreMsg, setPreviewRestoreMsg] = useState<string | null>(null);

  useEffect(() => {
    getSafeSession().then((s) => {
      if (!s?.user) {
        router.replace('/login?next=/dashboard');
        return;
      }
      setUser(s.user);
    });

    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjectCount(d.projects?.length ?? 0))
      .catch(() => {});

    if (searchParams.get('success') === 'true') {
      setCheckoutMsg('Payment successful! Your plan is now active.');
    }
  }, [router, searchParams]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const quickLinks = MAIN_NAV.filter((n) => n.href !== '/dashboard');

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-10">
        <NiskBuildLogo variant="lockup" size="md" />
        <h1 className="text-3xl font-bold text-white mt-6">Welcome back</h1>
        <p className="text-nisk-muted mt-1">{user.email}</p>
        {checkoutMsg && (
          <p className="mt-3 text-sm text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-lg px-4 py-2">
            {checkoutMsg}
          </p>
        )}
        {previewRestoreMsg && (
          <p className="mt-3 text-sm text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 rounded-lg px-4 py-2">
            {previewRestoreMsg}
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/builder"
          className="group p-6 rounded-2xl border border-nisk bg-nisk-card hover:border-[var(--accent-cyan)] transition-all card-hover"
        >
          <span className="text-2xl">⚡</span>
          <h2 className="text-lg font-semibold text-white mt-3 group-hover:text-[var(--accent-cyan)]">
            Open Builder
          </h2>
          <p className="text-sm text-nisk-muted mt-1">Start building with AI — large preview, resizable panels.</p>
        </Link>
        <Link
          href="/marketplace"
          className="group p-6 rounded-2xl border border-nisk bg-nisk-card hover:border-[var(--primary)] transition-all card-hover"
        >
          <span className="text-2xl">🏪</span>
          <h2 className="text-lg font-semibold text-white mt-3">Marketplace</h2>
          <p className="text-sm text-nisk-muted mt-1">Load templates into your workspace instantly.</p>
        </Link>
      </div>

      <div className="bg-nisk-card border border-nisk rounded-2xl p-6 mb-8">
        <h3 className="text-sm font-semibold text-white mb-3">Usage</h3>
        <ProjectLimitBadge userId={user.id} currentCount={projectCount} />
        <p className="text-xs text-nisk-muted mt-2">{projectCount} saved project{projectCount !== 1 ? 's' : ''}</p>
        <div className="mt-4 pt-4 border-t border-nisk">
          <p className="text-xs text-nisk-muted uppercase tracking-wider mb-2">Preview links</p>
          <PreviewLinksStatus
            onRestoreNotice={(count) =>
              setPreviewRestoreMsg(
                `Welcome back — your ${count} preview link${count !== 1 ? 's are' : ' is'} live again.`
              )
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {quickLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-nisk bg-nisk-surface hover:border-[var(--primary)]/50 transition-all text-sm text-gray-300 hover:text-white"
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
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
            <div className="w-8 h-8 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </Layout>
  );
}
