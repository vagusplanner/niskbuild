'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { DocArticleSummary, DocCategory } from '@/lib/docs/types';
import { DOC_CATEGORY_ORDER } from '@/lib/docs/utils';

interface DocsSidebarProps {
  articles: DocArticleSummary[];
  currentSlug?: string;
}

export default function DocsSidebar({ articles, currentSlug }: DocsSidebarProps) {
  const pathname = usePathname();

  const grouped = DOC_CATEGORY_ORDER.reduce(
    (acc, category) => {
      const items = articles.filter((a) => a.category === category);
      if (items.length > 0) acc[category] = items;
      return acc;
    },
    {} as Partial<Record<DocCategory, DocArticleSummary[]>>
  );

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="sticky top-20 space-y-6">
        <div>
          <Link
            href="/docs"
            className={`text-sm font-semibold ${
              pathname === '/docs' ? 'text-[var(--copper-melt)]' : 'text-nisk-muted hover:text-[var(--foreground)]'
            }`}
          >
            Documentation
          </Link>
          <p className="text-xs text-nisk-muted mt-1">Guides for account holders</p>
        </div>

        {DOC_CATEGORY_ORDER.map((category) => {
          const items = grouped[category];
          if (!items?.length) return null;

          return (
            <nav key={category} aria-label={category}>
              <h2 className="text-[10px] uppercase tracking-wider text-nisk-muted font-semibold mb-2 px-1">
                {category}
              </h2>
              <ul className="space-y-0.5">
                {items.map((article) => {
                  const active = currentSlug === article.slug;
                  return (
                    <li key={article.id}>
                      <Link
                        href={`/docs/${article.slug}`}
                        className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                          active
                            ? 'bg-[var(--copper-primary)]/15 text-[var(--copper-melt)] border border-[var(--copper-primary)]/30'
                            : 'text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface)]'
                        }`}
                      >
                        {article.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          );
        })}
      </div>
    </aside>
  );
}
