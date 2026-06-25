"use client";

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
}

function ProjectsContent() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSafeSession().then((s) => {
      if (!s?.user) {
        router.replace('/login?next=/projects');
        return;
      }
      fetch('/api/projects')
        .then((r) => r.json())
        .then((d) => setProjects(d.projects || []))
        .finally(() => setLoading(false));
    });
  }, [router]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">My Projects</h1>
          <p className="text-nisk-muted text-sm mt-1">Your subscriber-owned apps — not marketplace catalog items.</p>
        </div>
        <Link href="/builder" className="btn-primary px-4 py-2 rounded-xl text-sm">
          + New in Builder
        </Link>
      </div>

      {loading ? (
        <p className="text-nisk-muted">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-nisk rounded-2xl">
          <p className="text-nisk-muted mb-4">No projects yet.</p>
          <Link href="/marketplace" className="text-[var(--copper-melt)] hover:underline text-sm">
            Start from marketplace →
          </Link>
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
                  Draft
                </span>
              </button>
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
