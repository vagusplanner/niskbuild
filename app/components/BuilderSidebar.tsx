"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  const [avatarUrl, setAvatarUrl] = useState('');
  const [initials, setInitials] = useState('U');

  useEffect(() => {
    fetch('/api/settings/profile', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.profile) return;
        setAvatarUrl(data.profile.avatar_url || '');
        const name = data.profile.full_name || data.profile.email || 'U';
        setInitials(name.charAt(0).toUpperCase());
      })
      .catch(() => {});
  }, []);

  const items = MAIN_NAV.filter(
    (n) => n.href !== '/dashboard' && n.href !== '/dashboard/settings'
  );

  return (
    <aside className="w-[60px] shrink-0 flex flex-col items-center py-3 gap-1 border-r border-nisk bg-nisk-card shadow-[2px_0_16px_rgba(15,23,42,0.06)]">
      <Link href="/dashboard" className="mb-2 p-1 rounded-xl hover:bg-[var(--surface-elevated)] transition-colors" title="Dashboard">
        <Image
          src="/logo/niskbuild-icon.svg"
          alt="NiskBuild"
          width={40}
          height={40}
          className="shrink-0 object-contain drop-shadow-[0_2px_6px_rgba(15,23,42,0.12)] rounded-lg"
        />
      </Link>

      {items.map((item) => {
        if (item.href === '/builder') {
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`w-11 h-11 flex items-center justify-center rounded-xl text-lg transition-all ${
                pathname === '/builder'
                  ? 'bg-[var(--primary)]/12 text-[var(--primary)] ring-1 ring-[var(--primary)]/25 shadow-sm'
                  : 'text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]'
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
            className={`w-11 h-11 flex items-center justify-center rounded-xl text-lg transition-all ${
              pathname.startsWith(item.href)
                ? 'bg-[var(--secondary)]/10 text-[var(--secondary)] ring-1 ring-[var(--secondary)]/20'
                : 'text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]'
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
        className={`relative w-11 h-11 flex items-center justify-center rounded-xl text-lg transition-all ${
          projectsOpen
            ? 'bg-amber-500/12 text-amber-600 ring-1 ring-amber-500/25'
            : 'text-nisk-muted hover:text-[var(--foreground)] hover:bg-slate-100'
        }`}
      >
        📁
        {projectCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--primary)] text-white text-[9px] font-bold flex items-center justify-center">
            {projectCount > 9 ? '9+' : projectCount}
          </span>
        )}
      </button>

      <div className="flex-1" />

      <Link
        href="/dashboard/settings"
        title="Settings"
        className="w-11 h-11 flex items-center justify-center rounded-xl text-lg text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-all"
      >
        ⚙️
      </Link>

      <Link
        href="/dashboard"
        title="Account"
        className="w-11 h-11 rounded-xl overflow-hidden ring-1 ring-nisk hover:ring-[var(--primary)]/40 transition-all mb-1"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="w-full h-full flex items-center justify-center bg-gradient-brand text-white text-sm font-bold">
            {initials}
          </span>
        )}
      </Link>
    </aside>
  );
}
