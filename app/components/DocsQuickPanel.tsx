'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DOCS_PANEL_OPEN_EVENT } from '@/lib/docs-panel-events';
import type { DocArticleSummary } from '@/lib/docs/types';

export default function DocsQuickPanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<DocArticleSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const loadArticles = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      } else {
        params.set('context', pathname);
      }
      const res = await fetch(`/api/docs/articles?${params.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [pathname]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(DOCS_PANEL_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(DOCS_PANEL_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => void loadArticles(query), query ? 200 : 0);
    return () => clearTimeout(timer);
  }, [open, query, loadArticles]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
        aria-label="Close documentation panel"
        onClick={() => setOpen(false)}
      />
      <aside
        className="fixed top-0 right-0 z-[80] h-full w-full max-w-md bg-[var(--card-bg)] border-l border-nisk shadow-2xl flex flex-col"
        aria-label="Documentation quick help"
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-nisk">
          <div>
            <h2 className="font-semibold text-[var(--foreground)]">Help &amp; docs</h2>
            <p className="text-xs text-nisk-muted">Search guides without leaving your page</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface)]"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="px-5 py-4 border-b border-nisk">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documentation…"
            className="w-full rounded-xl border border-nisk bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-nisk-muted"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-nisk-muted">Loading…</p>
          ) : articles.length === 0 ? (
            <p className="text-sm text-nisk-muted">No articles match your search.</p>
          ) : (
            <ul className="space-y-2">
              {articles.map((article) => (
                <li key={article.id}>
                  <Link
                    href={`/docs/${article.slug}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl border border-nisk bg-[var(--surface)]/50 px-4 py-3 hover:border-[var(--copper-primary)]/40 transition-colors"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-nisk-muted mb-1">
                      {article.category}
                    </p>
                    <p className="text-sm font-medium text-[var(--foreground)]">{article.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="px-5 py-4 border-t border-nisk">
          <Link
            href="/docs"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-full rounded-xl border border-[var(--copper-primary)]/40 bg-[var(--copper-primary)]/10 px-4 py-2.5 text-sm font-medium text-[var(--copper-melt)] hover:bg-[var(--copper-primary)]/20 transition-colors"
          >
            View full docs
          </Link>
        </footer>
      </aside>
    </>
  );
}
