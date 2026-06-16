"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSafeSession } from '@/lib/supabaseSession';
import Layout from '@/app/components/Layout';
import NiskBuildLogo from '@/app/components/NiskBuildLogo';
import ProjectLimitBadge from '@/app/components/ProjectLimitBadge';
import PreviewLinksStatus from '@/app/components/PreviewLinksStatus';
import SeoScoreBadge from '@/app/components/SeoScoreBadge';
import MobileExportModal from '@/app/components/MobileExportModal';
import { MAIN_NAV } from '@/lib/nav-config';
import {
  downloadBlob,
  handleExportError,
  requestNativeExport,
  requestPwaExport,
  type MobileExportPayload,
} from '@/lib/mobile-export-client';
import { canExportCleanZip, canExportNative, canExportPwa } from '@/lib/tier-config';
import { slugifyProjectName } from '@/lib/version-limits';

interface SavedProject {
  id: string;
  title: string;
  prompt: string;
  generated_code: string;
  created_at: string;
  seo_score?: number | null;
  latest_version?: number;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive');
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);
  const [previewRestoreMsg, setPreviewRestoreMsg] = useState<string | null>(null);
  const [exportingZipId, setExportingZipId] = useState<string | null>(null);
  const [mobileExportProject, setMobileExportProject] = useState<SavedProject | null>(null);
  const [mobileExporting, setMobileExporting] = useState<'pwa' | 'native' | null>(null);

  const loadProjects = () => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(() => {});
  };

  useEffect(() => {
    getSafeSession().then((s) => {
      if (!s?.user) {
        router.replace('/login?next=/dashboard');
        return;
      }
      setUser(s.user);
    });

    loadProjects();

    fetch('/api/subscription/status', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.tier) {
          setSubscriptionTier(d.tier);
          setSubscriptionStatus(d.status ?? 'inactive');
        }
      })
      .catch(() => {});

    if (searchParams.get('success') === 'true') {
      setCheckoutMsg('Payment successful! Your plan is now active.');
    }
  }, [router, searchParams]);

  const canZip = canExportCleanZip(subscriptionTier, subscriptionStatus);
  const canPwa = canExportPwa(subscriptionTier, subscriptionStatus);
  const canNative = canExportNative(subscriptionTier, subscriptionStatus);

  const handleExportZip = async (project: SavedProject) => {
    if (!canZip) {
      const upgrade = confirm('Clean ZIP export requires an active paid plan.\n\nOpen Pricing?');
      if (upgrade) window.location.href = '/pricing';
      return;
    }

    setExportingZipId(project.id);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code: project.generated_code,
          prompt: project.prompt,
          projectName: project.title,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (res.status === 403 && err.upgrade) {
          const upgrade = confirm(`${err.error}\n\nOpen Pricing?`);
          if (upgrade) window.location.href = '/pricing';
          return;
        }
        throw new Error(err.error || 'Export failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = slugifyProjectName(project.title || project.prompt.substring(0, 50) || 'project');
      const versionSuffix =
        project.latest_version && project.latest_version > 0 ? `-v${project.latest_version}` : '';
      a.download = `${baseName}${versionSuffix}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setExportingZipId(null);
    }
  };

  const exportPayload = (project: SavedProject): MobileExportPayload => ({
    projectId: project.id,
  });

  const handleExportPwa = async () => {
    if (!mobileExportProject || !canPwa) return;
    setMobileExporting('pwa');
    try {
      const result = await requestPwaExport(exportPayload(mobileExportProject));
      if (!result.ok) {
        handleExportError(result.error || 'PWA export failed', result.upgrade);
        return;
      }
      downloadBlob(result.blob!, result.filename!);
      setMobileExportProject(null);
    } catch (err) {
      handleExportError(err instanceof Error ? err.message : 'PWA export failed');
    } finally {
      setMobileExporting(null);
    }
  };

  const handleExportNative = async () => {
    if (!mobileExportProject || !canNative) return;
    setMobileExporting('native');
    try {
      const result = await requestNativeExport(exportPayload(mobileExportProject));
      if (!result.ok) {
        handleExportError(result.error || 'Native export failed', result.upgrade);
        return;
      }
      downloadBlob(result.blob!, result.filename!);
      setMobileExportProject(null);
    } catch (err) {
      handleExportError(err instanceof Error ? err.message : 'Native export failed');
    } finally {
      setMobileExporting(null);
    }
  };

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
      <MobileExportModal
        open={!!mobileExportProject}
        projectTitle={mobileExportProject?.title || ''}
        canPwa={canPwa}
        canNative={canNative}
        exporting={mobileExporting}
        onClose={() => setMobileExportProject(null)}
        onExportPwa={handleExportPwa}
        onExportNative={handleExportNative}
      />

      <div className="mb-10">
        <NiskBuildLogo variant="lockup" size="md" />
        <h1 className="text-3xl font-bold text-[var(--foreground)] mt-6">Welcome back</h1>
        <p className="text-nisk-muted mt-1">{user.email}</p>
        {checkoutMsg && (
          <p className="mt-3 text-sm text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-lg px-4 py-2">
            {checkoutMsg}
          </p>
        )}
        {previewRestoreMsg && (
          <p className="mt-3 text-sm text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/10 rounded-lg px-4 py-2">
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
          <h2 className="text-lg font-semibold text-[var(--foreground)] mt-3 group-hover:text-[var(--accent-cyan)]">
            Open Builder
          </h2>
          <p className="text-sm text-nisk-muted mt-1">Start building with AI — large preview, resizable panels.</p>
        </Link>
        <Link
          href="/marketplace"
          className="group p-6 rounded-2xl border border-nisk bg-nisk-card hover:border-[var(--primary)] transition-all card-hover"
        >
          <span className="text-2xl">🏪</span>
          <h2 className="text-lg font-semibold text-[var(--foreground)] mt-3">Marketplace</h2>
          <p className="text-sm text-nisk-muted mt-1">Load templates into your workspace instantly.</p>
        </Link>
      </div>

      <div className="bg-nisk-card border border-nisk rounded-2xl p-6 mb-8">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Usage</h3>
        <ProjectLimitBadge userId={user.id} currentCount={projects.length} />
        <p className="text-xs text-nisk-muted mt-2">
          {projects.length} saved project{projects.length !== 1 ? 's' : ''}
        </p>
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

      <div className="bg-nisk-card border border-nisk rounded-2xl p-6 mb-8">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Saved Projects</h3>
        {projects.length === 0 ? (
          <p className="text-sm text-nisk-muted">
            No saved projects yet.{' '}
            <Link href="/builder" className="text-[var(--accent-cyan)] hover:underline">
              Open Builder
            </Link>{' '}
            to generate and save.
          </p>
        ) : (
          <ul className="space-y-3">
            {projects.map((project) => (
              <li
                key={project.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-nisk bg-nisk-surface"
              >
                <div className="min-w-0 flex items-start gap-2">
                  <SeoScoreBadge score={project.seo_score} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[var(--foreground)] truncate">{project.title}</p>
                      {project.latest_version != null && project.latest_version > 0 && (
                        <span className="text-[10px] text-nisk-muted font-mono shrink-0">
                          v{project.latest_version}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-nisk-muted mt-0.5">
                      {new Date(project.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('niskbuild_load_project_id', project.id);
                      router.push('/builder');
                    }}
                    className="btn-secondary px-3 py-1.5 text-xs rounded-lg"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportZip(project)}
                    disabled={exportingZipId === project.id}
                    className="btn-secondary px-3 py-1.5 text-xs rounded-lg disabled:opacity-40"
                  >
                    {exportingZipId === project.id ? 'Exporting…' : 'Export as ZIP'}
                  </button>
                  {canPwa && (
                    <button
                      type="button"
                      onClick={() => setMobileExportProject(project)}
                      className="btn-success px-3 py-1.5 text-xs rounded-lg"
                    >
                      Export as Mobile App
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {quickLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-nisk bg-nisk-surface hover:border-[var(--primary)]/50 transition-all text-sm text-gray-300 hover:text-[var(--foreground)]"
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
