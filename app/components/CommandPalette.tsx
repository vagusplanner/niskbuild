"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSafeSession } from '@/lib/supabaseSession';
import { complexityLabel } from '@/lib/marketplace-types';
import { DOCS_INDEX } from '@/lib/docs-index';
import {
  COMMAND_PALETTE_OPEN_EVENT,
  getRecentPaletteItems,
  pushRecentPaletteItem,
  type RecentPaletteItem,
} from '@/lib/command-palette-events';
import { modKey, shortcut } from '@/lib/keyboard';

type Section = 'Recent' | 'Projects' | 'Templates' | 'Quick Actions' | 'Docs';

type PaletteItem = {
  id: string;
  label: string;
  description?: string;
  section: Section;
  badge?: string;
  hint?: string;
  href?: string;
  run: () => void;
};

function fuzzyMatch(query: string, ...parts: string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = parts.join(' ').toLowerCase();
  if (hay.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < hay.length && qi < q.length; i++) {
    if (hay[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

function projectCategory(project: { project_context?: { type?: string } | null }): string {
  if (project.project_context?.type === 'google_places') return 'Local Business';
  return 'Web App';
}

function formatEditedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [projects, setProjects] = useState<
    { id: string; title: string; prompt: string; created_at: string; project_context?: unknown }[]
  >([]);
  const [recent, setRecent] = useState<RecentPaletteItem[]>([]);
  const [marketplaceListings, setMarketplaceListings] = useState<
    { id: string; name: string; description: string; prompt: string; complexity: number }[]
  >([]);
  const router = useRouter();
  const mod = modKey();

  const close = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setOpen(false);
      setQuery('');
      setActiveIndex(0);
    }, 150);
  }, []);

  const selectItem = useCallback(
    (item: PaletteItem) => {
      pushRecentPaletteItem({
        id: item.id,
        label: item.label,
        section: item.section,
        href: item.href,
      });
      close();
      item.run();
    },
    [close]
  );

  const quickActions: PaletteItem[] = useMemo(
    () => [
      {
        id: 'qa-new',
        label: 'New Project',
        section: 'Quick Actions',
        hint: shortcut(mod, 'N'),
        run: () => {
          window.dispatchEvent(new CustomEvent('niskbuild:builder-new-project'));
          router.push('/builder');
        },
      },
      {
        id: 'qa-export',
        label: 'Export Current Project',
        section: 'Quick Actions',
        hint: shortcut(mod, 'E'),
        run: () => window.dispatchEvent(new CustomEvent('niskbuild:builder-export')),
      },
      {
        id: 'qa-settings',
        label: 'Open Settings',
        section: 'Quick Actions',
        hint: `${mod},`,
        href: '/dashboard/settings',
        run: () => router.push('/dashboard/settings'),
      },
      {
        id: 'qa-support',
        label: 'Open Support',
        section: 'Quick Actions',
        href: '/dashboard/support',
        run: () => router.push('/dashboard/support'),
      },
      {
        id: 'qa-billing',
        label: 'View Billing',
        section: 'Quick Actions',
        hint: shortcut(mod, 'B'),
        href: '/dashboard/settings?tab=billing',
        run: () => router.push('/dashboard/settings?tab=billing'),
      },
      {
        id: 'qa-docs-help',
        label: 'Open Docs',
        section: 'Quick Actions',
        hint: '?',
        href: '/docs',
        run: () => router.push('/docs'),
      },
    ],
    [mod, router]
  );

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      requestAnimationFrame(() => setVisible(true));
      setRecent(getRecentPaletteItems());
    };
    window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    getSafeSession().then((session) => {
      if (!session?.user) return;
      fetch('/api/projects', { credentials: 'include' })
        .then((r) => r.json())
        .then((data) => setProjects(data.projects || []))
        .catch(() => setProjects([]));
    });
    fetch('/api/marketplace/listings?limit=20')
      .then((r) => r.json())
      .then((data) => setMarketplaceListings(data.templates || []))
      .catch(() => setMarketplaceListings([]));
  }, [open]);

  const projectItems: PaletteItem[] = useMemo(
    () =>
      projects.map((p) => ({
        id: `project-${p.id}`,
        label: p.title,
        description: formatEditedDate(p.created_at),
        section: 'Projects' as const,
        badge: projectCategory(p as { project_context?: { type?: string } | null }),
        hint: '↵',
        run: () => {
          localStorage.setItem('niskbuild_load_project_id', p.id);
          router.push('/builder');
        },
      })),
    [projects, router]
  );

  const templateItems: PaletteItem[] = useMemo(
    () =>
      marketplaceListings.map((t) => ({
        id: `template-${t.id}`,
        label: t.name,
        description: t.description,
        section: 'Templates' as const,
        badge: complexityLabel(t.complexity),
        hint: '↵',
        run: () => {
          localStorage.setItem('niskbuild_template_prompt', t.prompt);
          router.push('/builder');
        },
      })),
    [marketplaceListings, router]
  );

  const docItems: PaletteItem[] = useMemo(
    () =>
      DOCS_INDEX.map((d) => ({
        id: `doc-${d.id}`,
        label: d.title,
        description: d.section,
        section: 'Docs' as const,
        hint: '↵',
        href: d.href,
        run: () => router.push(d.href),
      })),
    [router]
  );

  const recentItems: PaletteItem[] = useMemo(() => {
    const map = new Map<string, PaletteItem>();
    [...projectItems, ...templateItems, ...docItems, ...quickActions].forEach((i) => map.set(i.id, i));
    return recent
      .map((r) => map.get(r.id))
      .filter((i): i is PaletteItem => !!i)
      .map((i) => ({ ...i, section: 'Recent' as const }));
  }, [recent, projectItems, templateItems, docItems, quickActions]);

  const filtered = useMemo(() => {
    const q = query.trim();
    const sections: PaletteItem[] = [];

    if (!q && recentItems.length > 0) {
      sections.push(...recentItems);
    }

    const match = (item: PaletteItem) =>
      fuzzyMatch(q, item.label, item.description || '', item.badge || '', item.section);

    if (q) {
      sections.push(...projectItems.filter(match));
      sections.push(...templateItems.filter(match));
      sections.push(...docItems.filter(match));
    }

    sections.push(...quickActions);

    return sections;
  }, [query, recentItems, projectItems, templateItems, docItems, quickActions]);

  const grouped = useMemo(() => {
    const order: Section[] = ['Recent', 'Projects', 'Templates', 'Quick Actions', 'Docs'];
    const groups: { section: Section; items: PaletteItem[] }[] = [];
    for (const section of order) {
      const items = filtered.filter((i) => i.section === section);
      if (items.length) groups.push({ section, items });
    }
    return groups;
  }, [filtered]);

  const flatItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) close();
        else {
          setOpen(true);
          requestAnimationFrame(() => setVisible(true));
          setRecent(getRecentPaletteItems());
        }
        setActiveIndex(0);
      }
      if (e.key === 'Escape' && open) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && flatItems[activeIndex]) {
        e.preventDefault();
        selectItem(flatItems[activeIndex]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, flatItems, activeIndex, selectItem]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 transition-opacity duration-150 ${
        visible ? 'opacity-100 bg-black/60 backdrop-blur-sm' : 'opacity-0 bg-black/0'
      }`}
      onClick={close}
    >
      <div
        className={`w-full max-w-xl bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden transition-all duration-150 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <span className="text-[var(--accent-cyan)] text-sm font-mono">{shortcut(mod, 'K')}</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search projects, templates, docs…"
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
          />
          <kbd className="text-[10px] text-nisk-muted font-mono hidden sm:inline">esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {flatItems.length === 0 ? (
            <p className="px-4 py-6 text-sm text-nisk-muted text-center">No results</p>
          ) : (
            grouped.map(({ section, items }) => (
              <div key={section}>
                <p className="px-4 py-1 text-[10px] uppercase tracking-wider text-nisk-muted">{section}</p>
                {items.map((item) => {
                  const idx = flatItems.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectItem(item)}
                      className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                        idx === activeIndex
                          ? 'bg-[var(--primary)]/15 text-white'
                          : 'text-gray-300 hover:bg-[var(--surface-elevated)]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{item.label}</span>
                          {item.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-nisk text-nisk-muted shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <span className="text-xs text-nisk-muted block truncate mt-0.5">
                            {item.description}
                          </span>
                        )}
                      </div>
                      {item.hint && (
                        <kbd className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded border border-nisk text-nisk-muted">
                          {item.hint}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
