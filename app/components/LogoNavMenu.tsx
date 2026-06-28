"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NiskBuildLogo from './NiskBuildLogo';
import type { NavItem } from '@/lib/nav-config';

interface LogoNavMenuProps {
  href: string;
  overflowNav: NavItem[];
  isNavActive: (href: string) => boolean;
}

export default function LogoNavMenu({ href, overflowNav, isNavActive }: LogoNavMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const overflowActive = overflowNav.some((item) => isNavActive(item.href));

  return (
    <div ref={rootRef} className="relative flex items-center gap-0.5">
      <NiskBuildLogo href={href} variant="lockup" size="sm" />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-center h-8 w-7 rounded-lg border transition-colors ${
          overflowActive || open
            ? 'border-[var(--copper-primary)] bg-[var(--copper-primary)]/15 text-[var(--copper-melt)]'
            : 'border-transparent text-nisk-muted hover:text-[var(--copper-melt)] hover:border-[var(--copper-primary)]/30 hover:bg-[var(--surface)]'
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open navigation menu"
        title="All pages"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full left-0 mt-2 min-w-[220px] py-1 rounded-xl border border-nisk bg-[var(--card-bg)] shadow-xl z-[70]"
        >
          <p className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-nisk-muted">Navigate</p>
          {overflowNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              className={`block px-4 py-2.5 text-sm transition-colors ${
                isNavActive(item.href)
                  ? 'text-[var(--copper-melt)] bg-[var(--copper-primary)]/10 font-semibold'
                  : 'text-nisk-muted hover:text-[var(--copper-melt)] hover:bg-[var(--surface)]'
              }`}
              onClick={() => setOpen(false)}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
