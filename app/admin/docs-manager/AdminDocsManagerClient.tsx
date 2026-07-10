'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminPlatformShell from '@/app/components/admin/AdminPlatformShell';
import { DOC_CATEGORIES, type DocArticleStatus } from '@/lib/docs/types';
import { docCategoryLabel } from '@/lib/docs/utils';

type AdminDocArticle = {
  id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  plan_visibility: string[];
  order_index: number;
  updated_at: string;
  status: DocArticleStatus;
};

function statusBadge(status: DocArticleStatus) {
  if (status === 'published') {
    return (
      <span className="inline-flex rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
        Published
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-md border border-[var(--copper-primary)]/35 bg-[var(--copper-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--copper-melt)]">
      Draft
    </span>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminDocsManagerClient() {
  const [articles, setArticles] = useState<AdminDocArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editCategory, setEditCategory] = useState<string>('product');
  const [editContent, setEditContent] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/docs', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to load articles');
      setArticles([]);
    } else {
      setArticles(data.articles ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => articles.find((a) => a.id === selectedId) ?? null,
    [articles, selectedId]
  );

  useEffect(() => {
    if (!selected) return;
    setEditTitle(selected.title);
    setEditSlug(selected.slug);
    setEditCategory(selected.category);
    setEditContent(selected.content);
  }, [selected]);

  const draftCount = articles.filter((a) => a.status === 'draft').length;
  const publishedCount = articles.filter((a) => a.status === 'published').length;

  const selectArticle = (article: AdminDocArticle) => {
    setSelectedId(article.id);
    setMessage(null);
    setError(null);
  };

  const patchArticle = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch('/api/admin/docs', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Update failed');
    }
    return data.article as AdminDocArticle;
  };

  const togglePublish = async (article: AdminDocArticle) => {
    setTogglingId(article.id);
    setError(null);
    setMessage(null);
    try {
      const next: DocArticleStatus = article.status === 'published' ? 'draft' : 'published';
      const updated = await patchArticle(article.id, { status: next });
      setArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setMessage(
        next === 'published'
          ? `Published “${updated.title}” — now visible on /docs`
          : `Unpublished “${updated.title}” — hidden from /docs`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toggle failed');
    } finally {
      setTogglingId(null);
    }
  };

  const saveEdits = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await patchArticle(selected.id, {
        title: editTitle,
        slug: editSlug,
        category: editCategory,
        content: editContent,
      });
      setArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setMessage(`Saved “${updated.title}”`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPlatformShell
      title="Docs manager"
      description="Stage draft documentation and publish when ready. Public /docs only shows published articles."
      stats={[
        { label: 'Total', value: articles.length },
        { label: 'Drafts', value: draftCount },
        { label: 'Published', value: publishedCount },
      ]}
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/docs" className="text-[var(--copper-melt)] hover:underline">
          Open public /docs →
        </Link>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-nisk px-3 py-1.5 text-nisk-muted hover:text-white"
        >
          Refresh
        </button>
      </div>

      {message && (
        <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-nisk-muted text-sm">Loading articles…</p>
      ) : articles.length === 0 ? (
        <div className="rounded-xl border border-nisk bg-nisk-card p-6 text-sm text-nisk-muted">
          <p className="text-[var(--foreground)] font-medium mb-2">No rows in doc_articles yet</p>
          <p>
            Run <code className="text-[var(--copper-light)]">supabase/docs-staging-migration.sql</code>{' '}
            then <code className="text-[var(--copper-light)]">supabase/docs-staging-seed.sql</code> in
            Supabase to create the draft articles.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            {articles.map((article) => (
              <article
                key={article.id}
                className={`rounded-xl border p-4 transition-colors ${
                  selectedId === article.id
                    ? 'border-[var(--copper-primary)]/50 bg-[var(--copper-primary)]/5'
                    : 'border-nisk bg-nisk-card'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => selectArticle(article)}
                    className="text-left min-w-0 flex-1"
                  >
                    <h2 className="font-semibold text-[var(--foreground)] truncate">{article.title}</h2>
                    <p className="text-xs text-nisk-muted mt-0.5 font-mono">{article.slug}</p>
                  </button>
                  {statusBadge(article.status)}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-nisk-muted">
                  <span>{docCategoryLabel(article.category)}</span>
                  <span>·</span>
                  <span>Updated {formatDate(article.updated_at)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => selectArticle(article)}
                    className="rounded-lg border border-nisk px-3 py-1.5 text-xs font-medium text-nisk-muted hover:text-white"
                  >
                    Edit markdown
                  </button>
                  <button
                    type="button"
                    disabled={togglingId === article.id}
                    onClick={() => void togglePublish(article)}
                    className="rounded-lg border border-[var(--copper-primary)]/40 bg-[var(--copper-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--copper-melt)] hover:bg-[var(--copper-primary)]/20 disabled:opacity-50"
                  >
                    {togglingId === article.id
                      ? 'Updating…'
                      : article.status === 'published'
                        ? 'Unpublish'
                        : 'Publish'}
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-xl border border-nisk bg-nisk-card p-4 lg:sticky lg:top-20 h-fit">
            {selected ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-[var(--foreground)]">Edit article</h3>
                <label className="block text-xs text-nisk-muted">
                  Title
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-nisk bg-[var(--iron-dark)] px-3 py-2 text-sm text-[var(--foreground)]"
                  />
                </label>
                <label className="block text-xs text-nisk-muted">
                  Slug
                  <input
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-nisk bg-[var(--iron-dark)] px-3 py-2 text-sm font-mono text-[var(--foreground)]"
                  />
                </label>
                <label className="block text-xs text-nisk-muted">
                  Category
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-nisk bg-[var(--iron-dark)] px-3 py-2 text-sm text-[var(--foreground)]"
                  >
                    {DOC_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {docCategoryLabel(c)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-nisk-muted">
                  Markdown content
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={18}
                    className="mt-1 w-full rounded-lg border border-nisk bg-[var(--iron-dark)] px-3 py-2 text-sm font-mono text-[var(--foreground)] leading-relaxed"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveEdits()}
                    className="rounded-lg btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                  {selected.status === 'published' ? (
                    <Link
                      href={`/docs/${selected.slug}`}
                      className="rounded-lg border border-nisk px-4 py-2 text-sm text-nisk-muted hover:text-white"
                    >
                      View on /docs
                    </Link>
                  ) : (
                    <span className="text-xs text-nisk-muted self-center">
                      Draft — not visible on public /docs
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-nisk-muted">Select an article to edit its markdown.</p>
            )}
          </div>
        </div>
      )}
    </AdminPlatformShell>
  );
}
