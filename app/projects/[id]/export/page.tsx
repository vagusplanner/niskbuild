'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getSafeSession } from '@/lib/supabaseSession';
import Layout from '@/app/components/Layout';
import UpgradeGate from '@/app/components/UpgradeGate';
import ExportProgressTracker from '@/app/components/ExportProgressTracker';
import { canExportMobileProject } from '@/lib/tier-config';
import type { ProjectExportChecklist, ProjectExportJobStatus } from '@/lib/project-export/types';

function ChecklistDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${ok ? 'bg-[var(--copper-primary)]' : 'bg-[var(--ember)]'}`}
      aria-hidden
    />
  );
}

function ProjectExportContent() {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params.id === 'string' ? params.id : '';

  const [authChecking, setAuthChecking] = useState(true);
  const [canExport, setCanExport] = useState(false);
  const [tier, setTier] = useState('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive');
  const [projectTitle, setProjectTitle] = useState('');
  const [checklist, setChecklist] = useState<ProjectExportChecklist | null>(null);
  const [bundleId, setBundleId] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [privacyUrl, setPrivacyUrl] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProjectExportJobStatus | null>(null);
  const [logTail, setLogTail] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [iosWorkspace, setIosWorkspace] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const statusUrl = `/api/projects/${projectId}/export/status`;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const session = await getSafeSession();
      if (!session?.user) {
        router.replace(`/login?next=/projects/${projectId}/export`);
        return;
      }

      const subRes = await fetch('/api/subscription/status', { credentials: 'include' }).catch(
        () => null
      );
      const sub = subRes?.ok ? await subRes.json() : null;
      const userTier = sub?.tier ?? 'free';
      const userStatus = sub?.status ?? 'inactive';
      if (!cancelled) {
        setTier(userTier);
        setSubscriptionStatus(userStatus);
        setCanExport(canExportMobileProject(userTier, userStatus));
      }

      const checklistRes = await fetch(statusUrl, { credentials: 'include' }).catch(() => null);
      if (checklistRes?.ok) {
        const data = await checklistRes.json();
        if (!cancelled) {
          setProjectTitle(data.projectTitle ?? 'Project');
          setChecklist(data.checklist ?? null);
          setBundleId(data.checklist?.bundleId ?? '');
          setIconUrl(data.checklist?.iconUrl ?? '');
          setPrivacyUrl(data.checklist?.privacyPolicyUrl ?? '');
        }
      }

      if (!cancelled) setAuthChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, router, statusUrl]);

  const saveMetadata = async () => {
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bundle_id: bundleId,
          icon_url: iconUrl,
          privacy_policy_url: privacyUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save');
        return;
      }
      const checklistRes = await fetch(statusUrl, { credentials: 'include' });
      if (checklistRes.ok) {
        const refreshed = await checklistRes.json();
        setChecklist(refreshed.checklist ?? null);
      }
    } finally {
      setSavingMeta(false);
    }
  };

  const startExport = useCallback(async () => {
    setStarting(true);
    setError(null);
    setJobId(null);
    setStatus(null);
    setLogTail('');
    setDownloadUrl(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.upgrade) {
          setCanExport(false);
        }
        setError(data.error || 'Failed to start export');
        setStarting(false);
        return;
      }

      setJobId(data.jobId);
      setStatus(data.status ?? 'pending');
      setStarting(false);
    } catch {
      setError('Network error starting export.');
      setStarting(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;

    const poll = async () => {
      const res = await fetch(`${statusUrl}?jobId=${jobId}`, { credentials: 'include' });
      if (!res.ok || cancelled) return null;

      const data = await res.json();
      setStatus(data.status);
      setLogTail(data.logTail ?? '');
      setDownloadUrl(data.downloadUrl ?? null);
      setIosWorkspace(data.iosWorkspace ?? null);
      return data.status as ProjectExportJobStatus;
    };

    void poll();
    const interval = setInterval(async () => {
      const next = await poll();
      if (next === 'ready' || next === 'failed') {
        clearInterval(interval);
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [jobId, statusUrl]);

  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[var(--copper-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
      <main className="min-w-0">
        <Link href="/projects" className="text-xs text-[var(--copper-melt)] hover:underline">
          ← Back to projects
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Export to App Store</h1>
        <p className="mt-2 text-sm text-nisk-muted">
          {projectTitle} — build a Capacitor package and prepare for Xcode on your Mac.
        </p>

        <div className="mt-8">
          <UpgradeGate
            featureName="Mobile export"
            headline="Mobile export is a Pro feature"
            body="Turn your project into a real iOS and Android app with one click — no extra setup, no separate tools. Build it, sync it to Xcode, and ship it to the App Store yourself."
            requiredTier="pro"
            currentTier={tier}
            subscriptionStatus={subscriptionStatus}
          >
            <div className="space-y-6">
              <ExportProgressTracker
                status={status}
                logTail={logTail}
                downloadUrl={downloadUrl}
                iosWorkspace={iosWorkspace}
              />

              {error && <p className="text-sm text-[var(--error)]">{error}</p>}

              <button
                type="button"
                onClick={() => void startExport()}
                disabled={
                  starting ||
                  (status !== null && status !== 'ready' && status !== 'failed')
                }
                className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {starting
                  ? 'Starting…'
                  : status === 'ready' || status === 'failed'
                    ? 'Export to App Store'
                    : status
                      ? 'Export running…'
                      : 'Export to App Store'}
              </button>

              {status === 'ready' && (
                <p className="text-xs text-nisk-muted">
                  Run <code className="text-[var(--foreground)]">npx cap open ios</code> on your own
                  Mac to sign and submit — this step requires Xcode and your Apple Developer account.
                </p>
              )}
            </div>
          </UpgradeGate>
        </div>
      </main>

      <aside className="space-y-4">
        <div className="p-4 border border-[var(--border)] bg-[var(--card-bg)] rounded-xl">
          <h2 className="text-sm font-semibold mb-3">App Store checklist</h2>
          <ul className="space-y-2 text-sm mb-4">
            {[
              { label: 'Bundle ID set', ok: checklist?.bundleIdSet ?? false },
              { label: 'App icon URL set', ok: checklist?.iconUploaded ?? false },
              { label: 'Privacy policy URL set', ok: checklist?.privacyPolicySet ?? false },
            ].map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <ChecklistDot ok={item.ok} />
                <span className={item.ok ? 'text-[var(--foreground)]' : 'text-nisk-muted'}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>

          <div className="space-y-3">
            <input
              value={bundleId}
              onChange={(e) => setBundleId(e.target.value)}
              placeholder="com.yourcompany.app"
              className="w-full px-3 py-2 rounded-lg bg-[var(--code-bg)] border border-[var(--border)] text-xs"
            />
            <input
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              placeholder="https://…/icon.png"
              className="w-full px-3 py-2 rounded-lg bg-[var(--code-bg)] border border-[var(--border)] text-xs"
            />
            <input
              value={privacyUrl}
              onChange={(e) => setPrivacyUrl(e.target.value)}
              placeholder="https://…/privacy"
              className="w-full px-3 py-2 rounded-lg bg-[var(--code-bg)] border border-[var(--border)] text-xs"
            />
            <button
              type="button"
              onClick={() => void saveMetadata()}
              disabled={savingMeta || !canExport}
              className="btn-secondary w-full py-2 rounded-lg text-xs disabled:opacity-50"
            >
              {savingMeta ? 'Saving…' : 'Save readiness fields'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function ProjectExportPage() {
  return (
    <Layout showFooter={false}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="w-8 h-8 border-4 border-[var(--copper-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <ProjectExportContent />
      </Suspense>
    </Layout>
  );
}
