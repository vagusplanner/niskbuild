'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSafeSession } from '@/lib/supabaseSession';
import Layout from '@/app/components/Layout';

interface Project {
  id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  org_id?: string | null;
  user_id?: string;
}

interface TeamOrg {
  id: string;
  name: string;
  role: string;
}

function ProjectsContent() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [orgs, setOrgs] = useState<TeamOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    const res = await fetch('/api/projects', { credentials: 'include' });
    if (!res.ok) {
      setLoadError("Couldn't load your projects. Try refreshing the page.");
      setProjects([]);
      return;
    }
    const data = await res.json();
    setProjects(data.projects || []);
    setOrgs(data.orgs || []);
    setLoadError(null);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const session = await getSafeSession();
      if (cancelled) return;
      if (!session?.user) {
        router.replace('/login?next=/projects');
        return;
      }

      try {
        await reload();
      } catch {
        setLoadError("Couldn't load your projects. Try refreshing the page.");
        setProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const moveToTeam = async (projectId: string) => {
    if (orgs.length === 0) return;
    const orgId =
      orgs.length === 1
        ? orgs[0].id
        : (() => {
            const lines = orgs.map((o, i) => `${i + 1}) ${o.name}`).join('\n');
            const pick = window.prompt(`Move to which team?\n${lines}\n\nEnter a number:`, '1');
            if (!pick) return null;
            const n = Number.parseInt(pick.trim(), 10);
            if (!Number.isFinite(n) || n < 1 || n > orgs.length) return null;
            return orgs[n - 1].id;
          })();
    if (!orgId) return;

    setBusyId(projectId);
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId, action: 'move_to_team', orgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Move failed');
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Move failed');
    } finally {
      setBusyId(null);
    }
  };

  const orgName = (orgId: string | null | undefined) =>
    orgs.find((o) => o.id === orgId)?.name || 'Team';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">My Projects</h1>
          <p className="text-nisk-muted text-sm mt-1">
            Personal projects plus shared team projects you can access.
          </p>
        </div>
        <Link href="/builder" className="btn-primary px-4 py-2 rounded-xl text-sm">
          + New in Builder
        </Link>
      </div>

      {loading ? (
        <p className="text-nisk-muted">Loading…</p>
      ) : loadError ? (
        <div className="rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3 text-sm text-[var(--error)]">
          {loadError}
        </div>
      ) : projects.length === 0 ? (
        <div className="brick-card-top rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center">
          <p className="text-sm font-semibold text-[var(--foreground)]">No projects yet</p>
          <p className="text-xs text-nisk-muted mt-2 max-w-md mx-auto">
            Start in the Builder with a plain-English prompt — your saved apps will show up here.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/builder" className="btn-primary px-4 py-2 rounded-lg text-sm">
              Open Builder →
            </Link>
            <Link href="/marketplace" className="text-sm text-[var(--copper-melt)] hover:underline">
              Or start from marketplace
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className="p-5 rounded-xl border border-nisk bg-nisk-card hover:border-[var(--copper-primary)]/40 card-hover flex flex-col"
            >
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('niskbuild_load_project_id', p.id);
                  router.push('/builder');
                }}
                className="text-left flex-1"
              >
                <h2 className="font-semibold text-[var(--foreground)] truncate">{p.title}</h2>
                <p className="text-[10px] text-nisk-muted mt-2">
                  Edited {new Date(p.created_at).toLocaleDateString()}
                </p>
                <span className="inline-block mt-3 text-[10px] uppercase px-2 py-0.5 rounded-full border border-nisk text-nisk-muted">
                  {p.org_id ? `Team · ${orgName(p.org_id)}` : 'Personal'}
                </span>
              </button>
              {!p.org_id && orgs.length > 0 && (
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => void moveToTeam(p.id)}
                  className="mt-3 text-center text-xs text-[var(--copper-melt)] hover:underline disabled:opacity-50"
                >
                  {busyId === p.id ? 'Moving…' : 'Move to team'}
                </button>
              )}
              <Link
                href={`/projects/${p.id}/export`}
                className="mt-4 text-center btn-secondary py-2 rounded-lg text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                Export to App Store
              </Link>
            </div>
          ))}
          <Link
            href="/marketplace"
            className="flex items-center justify-center p-5 rounded-xl border-2 border-dashed border-nisk text-nisk-muted hover:border-[var(--copper-primary)]/40 hover:text-[var(--copper-melt)] transition-colors min-h-[120px]"
          >
            Start from marketplace
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Layout>
      <Suspense fallback={<p className="text-nisk-muted py-12 text-center">Loading…</p>}>
        <ProjectsContent />
      </Suspense>
    </Layout>
  );
}
