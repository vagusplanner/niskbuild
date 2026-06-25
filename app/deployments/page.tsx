"use client";

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSafeSession } from '@/lib/supabaseSession';
import Layout from '@/app/components/Layout';
import PreviewLinksStatus from '@/app/components/PreviewLinksStatus';

function DeploymentsContent() {
  const router = useRouter();

  useEffect(() => {
    getSafeSession().then((s) => {
      if (!s?.user) router.replace('/login?next=/deployments');
    });
  }, [router]);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Deployments</h1>
      <p className="text-nisk-muted text-sm mb-8">
        Live preview links for your projects. Deploy from the Builder via Menu → Deploy live preview.
      </p>
      <div className="bg-nisk-card border border-nisk rounded-2xl p-6">
        <PreviewLinksStatus />
      </div>
      <p className="mt-6 text-sm text-nisk-muted">
        <Link href="/builder" className="text-[var(--copper-melt)] hover:underline">
          Open Builder
        </Link>{' '}
        to deploy a project.
      </p>
    </div>
  );
}

export default function DeploymentsPage() {
  return (
    <Layout>
      <Suspense fallback={<p className="text-nisk-muted py-12 text-center">Loading…</p>}>
        <DeploymentsContent />
      </Suspense>
    </Layout>
  );
}
