"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MAIN_NAV } from '@/lib/nav-config';

interface BuilderSidebarProps {
  onProjectsClick: () => void;
  projectCount: number;
  projectsOpen: boolean;
}

export default function BuilderSidebar({
  onProjectsClick,
  projectCount,
  projectsOpen,
}: BuilderSidebarProps) {
  const pathname = usePathname();
  const items = MAIN_NAV.filter((n) => n.href !== '/dashboard');

  return (
    <aside className="w-14 shrink-0 flex flex-col items-center py-3 gap-1 border-r border-nisk bg-nisk-card">
      {items.map((item) => {
        if (item.href === '/builder') {
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all ${
                pathname === '/builder'
                  ? 'bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] ring-1 ring-[var(--accent-cyan)]/30'
                  : 'text-nisk-muted hover:text-white hover:bg-[var(--surface-elevated)]'
              }`}
            >
              {item.icon}
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all ${
              pathname.startsWith(item.href)
                ? 'bg-[var(--primary)]/15 text-[var(--primary)]'
                : 'text-nisk-muted hover:text-white hover:bg-[var(--surface-elevated)]'
            }`}
          >
            {item.icon}
          </Link>
        );
      })}

      <div className="w-8 border-t border-nisk my-2" />

      <button
        type="button"
        onClick={onProjectsClick}
        title="Projects"
        className={`relative w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all ${
          projectsOpen
            ? 'bg-[var(--secondary)]/15 text-[var(--secondary)]'
            : 'text-nisk-muted hover:text-white hover:bg-[var(--surface-elevated)]'
        }`}
      >
        📁
        {projectCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--accent-cyan)] text-[#050508] text-[9px] font-bold flex items-center justify-center">
            {projectCount}
          </span>
        )}
      </button>

      <Link
        href="/dashboard"
        title="Dashboard"
        className={`w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all ${
          pathname.startsWith('/dashboard')
            ? 'bg-[var(--primary)]/15 text-[var(--primary)]'
            : 'text-nisk-muted hover:text-white hover:bg-[var(--surface-elevated)]'
        }`}
      >
        📊
      </Link>
    </aside>
  );
}
