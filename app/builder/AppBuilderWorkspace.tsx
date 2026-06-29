'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import BuilderSidebar from '@/app/components/BuilderSidebar';
import HelpAssistant from '@/app/components/HelpAssistant';
import PromptBar from '@/app/components/PromptBar';
import GooglePlacesImport, {
  type GooglePlacesImportHandle,
} from '@/app/components/GooglePlacesImport';
import AppBuilderPreview from '@/app/builder/[id]/preview';
import { getClientBuilderApp } from '@/lib/builder-apps/client-registry';
import type { BuilderAppTarget } from '@/lib/builder-apps/types';
import type {
  GooglePlacesBusiness,
  GooglePlacesProjectContext,
} from '@/lib/google-places-types';
import { getSafeSession } from '@/lib/supabaseSession';
import {
  canExportNative,
  canImportGooglePlaces,
  canUseCompetitorIntel,
  canUseSocialProofAggregator,
  canUseLocalOllama,
  getCloudCreditsForTier,
  isPaidAndActive,
  isSandboxTier,
} from '@/lib/tier-config';

const CodeEditor = dynamic(() => import('@/app/components/CodeEditor'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-nisk-muted text-sm">
      Loading editor…
    </div>
  ),
});

type AppBuilderWorkspaceProps = {
  appId: string;
  loginNextPath?: string;
};

function AppBuilderWorkspaceInner({ appId, loginNextPath }: AppBuilderWorkspaceProps) {
  const router = useRouter();
  const appConfig = getClientBuilderApp(appId);

  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [targets, setTargets] = useState<BuilderAppTarget[]>([]);
  const [targetId, setTargetId] = useState(appConfig?.defaultTargetId ?? 'Dashboard');
  const [source, setSource] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const googlePlacesRef = useRef<GooglePlacesImportHandle>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewUrlBase, setPreviewUrlBase] = useState(appConfig?.previewUrl ?? '');
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive');
  const [cloudCreditsRemaining, setCloudCreditsRemaining] = useState(0);
  const [useLocalOllama, setUseLocalOllama] = useState(false);
  const [loadingSource, setLoadingSource] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [supportsDeploy, setSupportsDeploy] = useState(false);
  const [supportsXcodeExport, setSupportsXcodeExport] = useState(false);
  const [showSource, setShowSource] = useState(false);

  const activeTarget = useMemo(
    () => targets.find((t) => t.id === targetId) ?? targets[0],
    [targets, targetId]
  );

  useEffect(() => {
    if (!statusMessage.trim()) return;
    setActivityLog((prev) => {
      if (prev[prev.length - 1] === statusMessage) return prev;
      return [...prev.slice(-48), statusMessage];
    });
  }, [statusMessage]);

  const handleGooglePlacesImport = (
    business: GooglePlacesBusiness,
    _context: GooglePlacesProjectContext
  ) => {
    setPrompt(
      `Update this Vagus Planner page for ${business.name} at ${business.address}. Match their brand and services.`
    );
    setStatusMessage(`📍 Imported ${business.name} — hit Generate`);
  };

  const loadTarget = useCallback(
    async (nextTargetId: string) => {
      setLoadingSource(true);
      try {
        const res = await fetch(
          `/api/builder/${encodeURIComponent(appId)}?target=${encodeURIComponent(nextTargetId)}`,
          { credentials: 'include' }
        );
        const data = await res.json();
        if (!res.ok) {
          setStatusMessage(`❌ ${data.error || 'Failed to load source'}`);
          return;
        }
        setTargets(data.targets ?? []);
        setTargetId(data.target?.id ?? nextTargetId);
        setSource(data.source ?? '');
        if (data.previewUrl) setPreviewUrlBase(data.previewUrl);
        setSupportsDeploy(!!data.app?.supportsDeploy);
        setSupportsXcodeExport(!!data.app?.supportsXcodeExport);
      } catch {
        setStatusMessage('❌ Network error loading source');
      } finally {
        setLoadingSource(false);
      }
    },
    [appId]
  );

  useEffect(() => {
    if (!appConfig) return;

    let cancelled = false;
    const nextPath = loginNextPath ?? `/builder/${appId}`;

    (async () => {
      const session = await getSafeSession();
      if (cancelled) return;

      if (!session?.user) {
        setAuthChecking(false);
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      setUser(session.user);
      setAuthChecking(false);

      fetch('/api/subscription/status', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          setSubscriptionTier(data.tier ?? 'free');
          setSubscriptionStatus(data.status ?? 'inactive');
          if (typeof data.credits === 'number') {
            setCloudCreditsRemaining(data.credits);
          } else if (data.tier) {
            setCloudCreditsRemaining(getCloudCreditsForTier(data.tier));
          }
          const sandbox = isSandboxTier(data.tier);
          const savedLocal = localStorage.getItem('niskbuild_use_local_ollama') === 'true';
          setUseLocalOllama(sandbox || (savedLocal && canUseLocalOllama(data.tier)));
        })
        .catch(() => {});

      await loadTarget(appConfig.defaultTargetId);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, appId, appConfig, loadTarget, loginNextPath]);

  const handleTargetChange = async (nextId: string) => {
    setTargetId(nextId);
    await loadTarget(nextId);
    setPreviewKey((k) => k + 1);
  };

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;

    setIsGenerating(true);
    setStatusMessage(`🔄 AI is editing ${appConfig?.name ?? 'app'} source…`);

    try {
      const res = await fetch(`/api/builder/${encodeURIComponent(appId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: trimmed,
          targetId,
          useLocal: useLocalOllama,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.upgrade) {
          const go = confirm(`${data.error || 'Upgrade required'}\n\nOpen Pricing?`);
          if (go) window.location.href = '/pricing';
        } else {
          setStatusMessage(`❌ ${data.error || 'Edit failed'}`);
        }
        return;
      }

      setSource(data.source ?? '');
      setPreviewKey((k) => k + 1);
      if (typeof data.creditsRemaining === 'number') {
        setCloudCreditsRemaining(data.creditsRemaining);
      }
      setStatusMessage(
        `✅ Saved to ${data.savedPath ?? appConfig?.srcRoot} — preview updating`
      );
    } catch {
      setStatusMessage('❌ Network error during edit');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setStatusMessage(''), 8000);
    }
  };

  const canUseCloud =
    isPaidAndActive(subscriptionTier, subscriptionStatus) || isSandboxTier(subscriptionTier);
  const canExportXcode = canExportNative(subscriptionTier, subscriptionStatus);
  const canDeploy = isPaidAndActive(subscriptionTier, subscriptionStatus);
  const canGooglePlaces = canImportGooglePlaces(subscriptionTier, subscriptionStatus);
  const canCompetitor = canUseCompetitorIntel(subscriptionTier, subscriptionStatus);
  const canSocialProof = canUseSocialProofAggregator(subscriptionTier, subscriptionStatus);

  const handleDeploy = async () => {
    if (deploying || isGenerating) return;

    if (!canDeploy) {
      const go = confirm('Deploy requires an active paid plan.\n\nOpen Pricing?');
      if (go) window.location.href = '/pricing';
      return;
    }

    setDeploying(true);
    setStatusMessage(`🔄 Building and deploying ${appConfig?.name ?? 'app'}…`);

    try {
      const res = await fetch(`/api/builder/${encodeURIComponent(appId)}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: appConfig?.deployTitle ?? appConfig?.name }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.upgrade) {
          const go = confirm(`${data.error || 'Upgrade required'}\n\nOpen Pricing?`);
          if (go) window.location.href = '/pricing';
        } else {
          setStatusMessage(`❌ ${data.error || 'Deploy failed'}`);
        }
        return;
      }

      setDeployedUrl(data.url ?? null);
      const opened = data.url
        ? window.open(data.url, '_blank', 'noopener,noreferrer')
        : null;

      if (!opened && data.url) {
        try {
          await navigator.clipboard.writeText(data.url);
          setStatusMessage(`✅ Deployed — link copied: ${data.url}`);
        } catch {
          setStatusMessage(`✅ Deployed — ${data.url}`);
        }
      } else {
        setStatusMessage(`✅ Deployed — ${data.url}`);
      }
    } catch {
      setStatusMessage('❌ Network error during deploy');
    } finally {
      setDeploying(false);
      setTimeout(() => setStatusMessage(''), 10000);
    }
  };

  if (!appConfig) {
    notFound();
  }

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
      </div>
    );
  }

  if (!user) return null;

  const previewReady = appConfig.previewEmbedPath || previewUrlBase;

  return (
    <div className="h-screen flex bg-[var(--background)] text-[var(--foreground)] overflow-hidden">
      <BuilderSidebar
        onProjectsClick={() => {}}
        projectCount={0}
        projectsOpen={false}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b-2 border-[var(--border)] bg-[var(--card-bg)]">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-[var(--accent-teal-bright)] font-semibold">
              {appConfig.studioLabel}
            </p>
            <h1 className="text-lg font-bold truncate">{appConfig.name}</h1>
            <p className="text-xs text-[var(--foreground)]/60 truncate">
              <code className="text-[var(--accent-teal-bright)]">{appConfig.srcRoot}/</code>
              {deployedUrl && (
                <>
                  {' · '}
                  <a
                    href={deployedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-teal-bright)] hover:underline"
                  >
                    Live URL
                  </a>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {supportsDeploy && (
              <button
                type="button"
                onClick={() => void handleDeploy()}
                disabled={deploying || isGenerating}
                title={canDeploy ? 'Build and publish live preview' : 'Paid plan required'}
                className={`px-3 py-1.5 text-xs font-semibold border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  canDeploy
                    ? 'border-[var(--accent-teal-bright)] text-[var(--accent-teal-bright)] hover:bg-[var(--accent-teal-bright)]/10'
                    : 'border-[var(--border)] text-[var(--foreground)]/50'
                }`}
              >
                {deploying ? 'Deploying…' : 'Deploy'}
              </button>
            )}
            {supportsXcodeExport && (
              <Link
                href={`/builder/${appId}/export`}
                title={
                  canExportXcode
                    ? 'Build Capacitor project and export for App Store / Xcode'
                    : 'Agency plan required'
                }
                className={`px-3 py-1.5 text-xs font-semibold border-2 transition-colors ${
                  canExportXcode
                    ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary)]/90'
                    : 'border-[var(--border)] text-[var(--foreground)]/50 pointer-events-none opacity-50'
                }`}
              >
                Export to Xcode
              </Link>
            )}
            <Link
              href="/builder"
              className="px-3 py-1.5 text-xs font-semibold border-2 border-[var(--border)] hover:border-[var(--primary)] transition-colors"
            >
              HTML Builder
            </Link>
            <Link
              href={appConfig.openAppHref}
              className="px-3 py-1.5 text-xs font-semibold border-2 border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--accent-teal-bright)]"
            >
              Open app
            </Link>
          </div>
        </header>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* Left: prompt + controls */}
          <aside className="w-full lg:w-[400px] shrink-0 flex flex-col border-b-2 lg:border-b-0 lg:border-r-2 border-[var(--border)] bg-[var(--card-bg)]">
            <div className="shrink-0 p-4 space-y-3 border-b border-[var(--border)]">
              <label className="block text-xs uppercase tracking-wider text-[var(--foreground)]/60 font-semibold">
                Page to edit
              </label>
              <select
                value={targetId}
                onChange={(e) => void handleTargetChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border-2 border-[var(--border)] bg-[var(--surface)] focus:border-[var(--primary)] outline-none"
                disabled={loadingSource || isGenerating}
              >
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              {activeTarget && (
                <p className="text-xs text-[var(--foreground)]/50 font-mono truncate">
                  {activeTarget.file}
                </p>
              )}
            </div>

            <div className="shrink-0 flex-1 min-h-0 flex flex-col">
              {!canUseCloud && !useLocalOllama && (
                <p className="px-4 pt-3 text-xs text-amber-600">
                  Cloud AI requires Pro.{' '}
                  <Link href="/pricing" className="underline">
                    Upgrade
                  </Link>{' '}
                  or enable local Ollama.
                </p>
              )}
              <PromptBar
                variant="cursor"
                prompt={prompt}
                onChange={setPrompt}
                onGenerate={() => void handleGenerate()}
                isGenerating={isGenerating}
                statusMessage={statusMessage}
                activityLog={activityLog}
                streamingLine={isGenerating ? statusMessage : undefined}
                onOpenGooglePlaces={() => googlePlacesRef.current?.open()}
                subscriptionTier={subscriptionTier}
                subscriptionStatus={subscriptionStatus}
                useLocalOllama={useLocalOllama}
                onUseLocalOllamaChange={(enabled) => {
                  setUseLocalOllama(enabled);
                  localStorage.setItem('niskbuild_use_local_ollama', enabled ? 'true' : 'false');
                }}
              />
              <p className="px-4 pb-2 text-[10px] text-[var(--foreground)]/40">
                {cloudCreditsRemaining > 0
                  ? `${cloudCreditsRemaining} cloud credits remaining`
                  : 'Edits save to disk — preview reloads after each change.'}
              </p>

              <button
                type="button"
                onClick={() => setShowSource((v) => !v)}
                className="mx-4 mb-3 px-3 py-1.5 text-xs font-semibold border border-[var(--border)] hover:border-[var(--primary)] text-left"
              >
                {showSource ? '▾ Hide source' : '▸ View source code'}
              </button>

              {showSource && (
                <div className="flex-1 min-h-[180px] border-t border-[var(--border)]">
                  {loadingSource ? (
                    <div className="h-full flex items-center justify-center text-sm text-[var(--foreground)]/50">
                      Loading source…
                    </div>
                  ) : (
                    <CodeEditor
                      path={activeTarget?.file ?? 'pages/Dashboard.jsx'}
                      value={source}
                      onChange={setSource}
                      readOnly={isGenerating}
                    />
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* Right: live preview iframe */}
          {previewReady && (
            <AppBuilderPreview
              embedPath={appConfig.previewEmbedPath}
              previewUrl={previewUrlBase}
              route={activeTarget?.route}
              previewKey={previewKey}
              appName={appConfig.name}
              onReload={() => setPreviewKey((k) => k + 1)}
            />
          )}
        </div>
      </div>

      <GooglePlacesImport
        ref={googlePlacesRef}
        canImport={canGooglePlaces}
        canUseCompetitorIntel={canCompetitor}
        canUseSocialProof={canSocialProof}
        onImport={handleGooglePlacesImport}
      />

      <HelpAssistant mode="user" projectId={appId} />
    </div>
  );
}

export default function AppBuilderWorkspace(props: AppBuilderWorkspaceProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
        </div>
      }
    >
      <AppBuilderWorkspaceInner {...props} />
    </Suspense>
  );
}
