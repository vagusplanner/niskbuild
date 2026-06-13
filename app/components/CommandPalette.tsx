"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSafeSession } from '@/lib/supabaseSession';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  href?: string;
  action?: () => void;
  group: string;
}

const BASE_ITEMS: CommandItem[] = [
  { id: 'builder', label: 'Open Builder', description: 'AI app workspace', href: '/builder', group: 'Workspace' },
  { id: 'games', label: 'Game Builder', description: 'AI Phaser.js games overview', href: '/games', group: 'Workspace' },
  { id: 'game-templates', label: 'Game Templates', description: 'Platformer, puzzle, runner', href: '/templates/games', group: 'Workspace' },
  { id: 'marketplace', label: 'Marketplace', description: 'Templates from $0–$49', href: '/marketplace', group: 'Workspace' },
  { id: 'pricing', label: 'Pricing', description: 'Plans & upgrades', href: '/pricing', group: 'Account' },
  { id: 'settings', label: 'Settings & Billing', description: 'API keys, Stripe portal', href: '/dashboard/settings', group: 'Account' },
  { id: 'landing', label: 'Landing Page', description: 'Marketing site', href: '/landing', group: 'Navigate' },
  { id: 'login', label: 'Sign In', description: 'Account access', href: '/login', group: 'Account' },
  { id: 'dashboard', label: 'Dashboard', description: 'Projects & usage hub', href: '/dashboard', group: 'Account' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [projectItems, setProjectItems] = useState<CommandItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    getSafeSession().then((session) => {
      if (!session?.user) return;
      fetch('/api/projects')
        .then((r) => r.json())
        .then((data) => {
          const items: CommandItem[] = (data.projects || []).slice(0, 12).map(
            (p: { id: string; title: string; prompt: string }) => ({
              id: `project-${p.id}`,
              label: p.title,
              description: 'Open project in builder',
              action: () => {
                localStorage.setItem('niskbuild_load_project_id', p.id);
                router.push('/builder');
              },
              group: 'Projects',
            })
          );
          setProjectItems(items);
        })
        .catch(() => setProjectItems([]));
    });
  }, [open, router]);

  const items = useMemo(() => [...projectItems, ...BASE_ITEMS], [projectItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    );
  }, [items, query]);

  const runItem = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      setQuery('');
      if (item.action) item.action();
      else if (item.href) router.push(item.href);
    },
    [router]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        setActiveIndex(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault();
        runItem(filtered[activeIndex]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIndex, runItem]);

  if (!open) return null;

  const groups = [...new Set(filtered.map((i) => i.group))];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <span className="text-[var(--accent-cyan)] text-sm">⌘K</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search projects, templates, settings..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
          />
        </div>
        <div className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-nisk-muted text-center">No results</p>
          ) : (
            groups.map((group) => (
              <div key={group}>
                <p className="px-4 py-1 text-[10px] uppercase tracking-wider text-nisk-muted">{group}</p>
                {filtered
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const idx = filtered.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => runItem(item)}
                        className={`w-full text-left px-4 py-2.5 flex flex-col transition-colors ${
                          idx === activeIndex
                            ? 'bg-[var(--primary)]/15 text-white'
                            : 'text-gray-300 hover:bg-[var(--surface-elevated)]'
                        }`}
                      >
                        <span className="text-sm font-medium">{item.label}</span>
                        {item.description && (
                          <span className="text-xs text-nisk-muted">{item.description}</span>
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
