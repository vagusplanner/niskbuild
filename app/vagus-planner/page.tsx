'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSafeSession } from '@/lib/supabaseSession';

const VAGUS_PLANNER_URL =
  process.env.NEXT_PUBLIC_VAGUS_PLANNER_URL?.trim() || 'http://localhost:5175';

function VagusPlannerEmbedInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);

  const routeParam = searchParams.get('route') || '/Dashboard';
  const route = routeParam.startsWith('/') ? routeParam : `/${routeParam}`;
  const builderKey = searchParams.get('builder') || '1';
  const iframeSrc = `${VAGUS_PLANNER_URL.replace(/\/$/, '')}${route}?builder=${builderKey}`;

  useEffect(() => {
    let cancelled = false;

    async function gate() {
      try {
        const session = await getSafeSession();
        if (cancelled) return;

        if (!session?.user) {
          router.replace('/login?next=/vagus-planner');
          return;
        }

        const ownerRes = await fetch('/api/admin/platform-owner', { credentials: 'include' });
        if (cancelled) return;

        if (!ownerRes.ok) {
          setDenied(true);
          return;
        }

        setReady(true);
      } catch {
        if (!cancelled) router.replace('/login?next=/vagus-planner');
      }
    }

    gate();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (denied) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-nisk">
        <div className="text-center max-w-md px-6">
          <p className="text-lg font-semibold text-[var(--foreground)] mb-2">Admin access only</p>
          <p className="text-nisk-muted text-sm mb-4">
            Vagus Planner is available to platform administrators only.
          </p>
          <a href="/dashboard" className="btn-primary inline-block px-6 py-2 rounded-xl text-sm">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-nisk">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[var(--copper-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-nisk-muted text-sm">Loading Vagus Planner…</p>
          <p className="mt-1 text-[10px] text-nisk-muted">Requires VP dev server on port 5175</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={iframeSrc}
      title="Vagus Planner"
      className="fixed inset-0 h-full w-full border-0 bg-[var(--background)]"
      allow="clipboard-read; clipboard-write; fullscreen"
    />
  );
}

export default function VagusPlannerEmbedPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-nisk">
          <div className="w-10 h-10 border-4 border-[var(--copper-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VagusPlannerEmbedInner />
    </Suspense>
  );
}
