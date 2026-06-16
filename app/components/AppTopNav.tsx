"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSafeSession } from '@/lib/supabaseSession';
import { openCommandPalette } from '@/lib/command-palette-events';
import { modKey } from '@/lib/keyboard';
import NiskBuildLogo from './NiskBuildLogo';
import AuthButton from './AuthButton';
import ThemeToggle from './ThemeToggle';
import { MAIN_NAV } from '@/lib/nav-config';
import { MARKETING_NAV } from '@/lib/landing-nav';

interface AppTopNavProps {
  variant?: 'marketing' | 'app' | 'builder';
}

export default function AppTopNav({ variant = 'app' }: AppTopNavProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getSafeSession().then((s) => setUser(s?.user ?? null));
  }, []);

  const nav = variant === 'marketing' ? MARKETING_NAV : MAIN_NAV.filter((n) => n.href !== '/landing');

  const isNavActive = (href: string) => {
    const path = href.split('#')[0];
    if (path === '/dashboard') return pathname === '/dashboard';
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const linkClass = (href: string) => {
    const base =
      'px-3 py-2 rounded-lg text-sm font-medium transition-all text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]';
    if (!mounted) return base;
    return isNavActive(href)
      ? 'px-3 py-2 rounded-lg text-sm font-medium transition-all text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10'
      : base;
  };

  const isBuilder = variant === 'builder';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 glass-nav">
      <div className="h-full max-w-[1800px] mx-auto px-4 flex items-center justify-between gap-4">
        <NiskBuildLogo
          href={user ? '/dashboard' : '/landing'}
          variant="lockup"
          size="sm"
        />

        {!isBuilder && (
        <nav className="hidden md:flex items-center gap-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>
        )}

        {isBuilder && (
          <div className="hidden md:flex items-center gap-2 text-xs text-nisk-muted">
            <span className="px-2.5 py-1 rounded-full bg-[var(--surface)] border border-nisk font-medium text-[var(--foreground)]">
              Builder
            </span>
            <span className="text-nisk-muted">⌘S save · ⌘B inspector · F fullscreen</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {(variant === 'app' || isBuilder) && (
            <>
              <button
                type="button"
                onClick={openCommandPalette}
                className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-nisk text-nisk-muted hover:text-[var(--foreground)] hover:border-[var(--primary)]/35 hover:bg-[var(--surface-elevated)] transition-colors"
                aria-label="Open command palette"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] border border-nisk">
                  {modKey()}K
                </kbd>
              </button>
              <button
                type="button"
                onClick={openCommandPalette}
                className="sm:hidden p-2 text-nisk-muted hover:text-[var(--foreground)]"
                aria-label="Search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </>
          )}
          <ThemeToggle compact />
          {variant === 'marketing' && !user && (
            <Link href="/login" className="btn-ghost hidden sm:inline-flex text-sm">
              Sign In
            </Link>
          )}
          {user ? (
            <AuthButton user={user} nextPath="/builder" />
          ) : variant === 'marketing' ? (
            <Link href="/login" className="btn-primary text-sm px-4 py-2 rounded-xl">
              Get Started
            </Link>
          ) : (
            <Link href="/login" className="btn-primary text-sm px-4 py-2 rounded-xl">
              Sign In
            </Link>
          )}
          <button
            type="button"
            className="md:hidden p-2 text-nisk-muted hover:text-[var(--foreground)]"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border)] glass-nav px-4 py-3 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={linkClass(item.href)}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
