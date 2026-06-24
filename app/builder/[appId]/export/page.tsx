'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { getSafeSession } from '@/lib/supabaseSession';
import { getClientBuilderApp } from '@/lib/builder-apps/client-registry';
import { canExportNative } from '@/lib/tier-config';
import type { AppStoreChecklist, ExportJobStatus } from '@/lib/builder-export/types';

type StepState = 'pending' | 'running' | 'done' | 'failed';

type JobStatusResponse = {
  jobId: string;
  status: ExportJobStatus;
  logTail: string;
  iosWorkspace: string | null;
  capacitorRoot: string | null;
  startedAt: string;
  finishedAt: string | null;
};

const STEPS = [
  { key: 'build', label: 'Build web bundle' },
  { key: 'sync', label: 'Sync to Capacitor' },
  { key: 'xcode', label: 'Ready for Xcode' },
] as const;

function stepStateForStatus(
  status: ExportJobStatus | null,
  stepIndex: number,
  log: string
): StepState {
  if (!status) return 'pending';
  if (status === 'ready_for_xcode') return 'done';
  if (status === 'building') {
    return stepIndex === 0 ? 'running' : 'pending';
  }
  if (status === 'syncing') {
    if (stepIndex === 0) return 'done';
    if (stepIndex === 1) return 'running';
    return 'pending';
  }
  if (status === 'failed') {
    const reachedSync =
      log.includes('syncing Capacitor') ||
      log.includes('cap sync') ||
      log.includes('Web bundle ready');
    if (stepIndex === 0) return reachedSync ? 'done' : 'failed';
    if (stepIndex === 1) return reachedSync ? 'failed' : 'pending';
    return 'pending';
  }
  return 'pending';
}

function StepIcon({ state }: { state: StepState }) {
  if (state === 'running') {
    return (
      <span className="w-7 h-7 flex items-center justify-center">
        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--primary)]" />
      </span>
    );
  }
  if (state === 'done') {
    return (
      <span className="w-7 h-7 flex items-center justify-center text-emerald-500 border-2 border-emerald-500 text-xs font-bold">
        ✓
      </span>
    );
  }
  if (state === 'failed') {
    return (
      <span className="w-7 h-7 flex items-center justify-center text-red-500 border-2 border-red-500 text-xs font-bold">
        ✕
      </span>
    );
  }
  return (
    <span className="w-7 h-7 flex items-center justify-center border-2 border-[var(--border)] text-xs text-nisk-muted">
      ○
    </span>
  );
}

function ChecklistDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`}
      aria-hidden
    />
  );
}

function AppExportContent() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const appId =
    typeof params.appId === 'string'
      ? params.appId
      : pathname.match(/\/builder\/([^/]+)\/export/)?.[1] ?? '';
  const appMeta = getClientBuilderApp(appId);

  const [authChecking, setAuthChecking] = useState(true);
  const [canExport, setCanExport] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<ExportJobStatus | null>(null);
  const [logTail, setLogTail] = useState('');
  const [iosWorkspace, setIosWorkspace] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [checklist, setChecklist] = useState<AppStoreChecklist | null>(null);

  const pollUrl = `/api/builder/${appId}/export/status`;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const session = await getSafeSession();
      if (cancelled) return;

      if (!session?.user) {
        router.replace(`/login?next=/builder/${appId}/export`);
        return;
      }

      const subRes = await fetch('/api/subscription/status', { credentials: 'include' }).catch(
        () => null
      );
      const sub = subRes?.ok ? await subRes.json() : null;
      const tier = sub?.tier ?? 'free';
      const subStatus = sub?.status ?? 'inactive';
      setCanExport(canExportNative(tier, subStatus));

      const checklistRes = await fetch(pollUrl, { credentials: 'include' }).catch(() => null);
      if (checklistRes?.ok) {
        const data = await checklistRes.json();
        setChecklist(data.checklist ?? null);
      }

      setAuthChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [appId, pollUrl, router]);

  const startExport = useCallback(async () => {
    setStarting(true);
    setError(null);
    setJobId(null);
    setStatus(null);
    setLogTail('');

    try {
      const res = await fetch(`/api/builder/${appId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.upgrade) {
          const go = confirm(`${data.error || 'Upgrade required'}\n\nOpen Pricing?`);
          if (go) window.location.href = '/pricing';
        }
        setError(data.error || 'Failed to start export');
        setStarting(false);
        return;
      }

      setJobId(data.jobId);
      setStatus(data.status ?? 'building');
      setStarting(false);
    } catch {
      setError('Network error starting export.');
      setStarting(false);
    }
  }, [appId]);

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;

    const poll = async () => {
      const res = await fetch(`${pollUrl}?jobId=${jobId}`, { credentials: 'include' });
      if (!res.ok || cancelled) return;

      const data: JobStatusResponse = await res.json();
      setStatus(data.status);
      setLogTail(data.logTail ?? '');
      setIosWorkspace(data.iosWorkspace ?? null);

      return data.status;
    };

    void poll();
    const interval = setInterval(async () => {
      const next = await poll();
      if (next === 'ready_for_xcode' || next === 'failed') {
        clearInterval(interval);
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [jobId, pollUrl]);

  const stepStates = useMemo(
    () => STEPS.map((_, i) => stepStateForStatus(status, i, logTail)),
    [status, logTail]
  );

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
      </div>
    );
  }

  if (!appMeta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <p className="text-nisk-muted">Unknown builder app.</p>
      </div>
    );
  }

  const capOpenPath = iosWorkspace
    ? iosWorkspace.replace(/\/ios\/App\/App\.xcworkspace$/, '')
    : `mobile/${appId}`;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        <main className="min-w-0">
          <Link
            href={`/builder/${appId}`}
            className="text-xs text-[var(--accent-teal-bright)] hover:underline"
          >
            ← Back to {appMeta.name} Studio
          </Link>

          <h1 className="mt-4 text-2xl font-bold">App Store Export</h1>
          <p className="mt-2 text-sm text-[var(--foreground)]/70">
            Builds the {appMeta.name} web bundle, syncs Capacitor for iOS and Android, then
            prepares the native project for Xcode on your Mac.
          </p>

          {!canExport && (
            <div className="mt-6 p-4 border-2 border-amber-500/40 bg-amber-500/10 text-sm rounded-xl">
              App Store export requires an active Agency plan or above.{' '}
              <Link href="/pricing" className="underline text-[var(--accent-teal-bright)]">
                View plans
              </Link>
            </div>
          )}

          {canExport && (
            <div className="mt-8 space-y-6">
              <div className="p-5 border border-[var(--border)] bg-[var(--card-bg)] rounded-xl">
                <p className="text-xs uppercase tracking-wider text-nisk-muted font-semibold mb-4">
                  Export progress
                </p>
                <ol className="space-y-4">
                  {STEPS.map((step, i) => (
                    <li key={step.key} className="flex items-start gap-3">
                      <StepIcon state={stepStates[i]} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{step.label}</p>
                        {stepStates[i] === 'failed' && logTail && (
                          <pre className="mt-2 text-[10px] font-mono text-red-400/90 whitespace-pre-wrap max-h-24 overflow-y-auto bg-[var(--surface)] p-2 rounded border border-red-500/20">
                            {logTail.slice(-800)}
                          </pre>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {logTail && status !== 'ready_for_xcode' && (
                <pre className="text-[10px] font-mono text-nisk-muted whitespace-pre-wrap max-h-40 overflow-y-auto bg-[var(--surface)] p-3 rounded-xl border border-nisk">
                  {logTail}
                </pre>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="button"
                onClick={() => void startExport()}
                disabled={starting || (status !== null && status !== 'ready_for_xcode' && status !== 'failed')}
                className="px-5 py-2.5 text-sm font-semibold border-2 border-[var(--primary)] bg-[var(--primary)] text-[var(--background)] hover:opacity-90 disabled:opacity-50 rounded-lg"
              >
                {starting
                  ? 'Starting…'
                  : status === 'ready_for_xcode' || status === 'failed'
                    ? 'Start Export'
                    : status
                      ? 'Export running…'
                      : 'Start Export'}
              </button>

              {status === 'ready_for_xcode' && (
                <div className="p-5 border-2 border-emerald-500/30 bg-emerald-500/5 rounded-xl space-y-3">
                  <h2 className="text-lg font-semibold text-emerald-400">Your build is ready</h2>
                  <p className="text-sm text-[var(--foreground)]/80">
                    Now on your Mac terminal, from the project root:
                  </p>
                  <pre className="text-xs font-mono bg-[var(--surface)] p-3 rounded-lg border border-nisk overflow-x-auto">
                    cd {capOpenPath}
                    {'\n'}npx cap open ios
                  </pre>
                  <p className="text-sm text-[var(--foreground)]/70">
                    This opens Xcode where you&apos;ll set your signing certificate, app icon,
                    capabilities, and archive for App Store Connect. This step requires Xcode and
                    cannot be automated from the browser.
                  </p>
                  {iosWorkspace && (
                    <p className="text-[10px] font-mono text-nisk-muted break-all">
                      Workspace: {iosWorkspace}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        <aside className="space-y-4">
          <div className="p-4 border border-nisk bg-[var(--card-bg)] rounded-xl">
            <h2 className="text-sm font-semibold mb-3">App Store checklist</h2>
            <ul className="space-y-3 text-sm">
              {[
                { label: 'Bundle ID set', ok: checklist?.bundleIdSet ?? false },
                { label: 'App icon uploaded', ok: checklist?.appIconUploaded ?? false },
                { label: 'Privacy policy URL set', ok: checklist?.privacyPolicySet ?? false },
                {
                  label: 'App Store screenshots uploaded',
                  ok: checklist?.appStoreScreenshotsUploaded ?? false,
                },
              ].map((item) => (
                <li key={item.label} className="flex items-center gap-2">
                  <ChecklistDot ok={item.ok} />
                  <span className={item.ok ? 'text-[var(--foreground)]' : 'text-nisk-muted'}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
            {checklist?.bundleId && (
              <p className="mt-3 text-[10px] font-mono text-nisk-muted break-all">
                {checklist.bundleId}
              </p>
            )}
            {checklist?.appStoreConnectUrl && checklist.bundleIdSet && (
              <a
                href={checklist.appStoreConnectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-xs text-[var(--accent-teal-bright)] hover:underline"
              >
                View in App Store Connect →
              </a>
            )}
          </div>

          <div className="p-4 border border-nisk bg-[var(--card-bg)] rounded-xl text-xs text-nisk-muted">
            <p>
              Run exports locally with <code className="text-[var(--foreground)]">npm run dev</code>{' '}
              on macOS. Vercel cannot execute Capacitor sync. See{' '}
              <code className="text-[var(--foreground)]">docs/app-store-submission.md</code> in the
              repo for the full Xcode and App Store Connect flow.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function AppExportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
        </div>
      }
    >
      <AppExportContent />
    </Suspense>
  );
}
