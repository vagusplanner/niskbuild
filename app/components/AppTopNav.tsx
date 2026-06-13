"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSafeSession } from '@/lib/supabaseSession';
import NiskBuildLogo from './NiskBuildLogo';
import AuthButton from './AuthButton';
import ThemeToggle from './ThemeToggle';
import { MAIN_NAV } from '@/lib/nav-config';

interface AppTopNavProps {
  variant?: 'marketing' | 'app';
}

export default function AppTopNav({ variant = 'app' }: AppTopNavProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    getSafeSession().then((s) => setUser(s?.user ?? null));
  }, []);

  const nav = variant === 'marketing'
    ? [
        { href: '/landing#features', label: 'Features' },
        { href: '/landing#templates', label: 'Templates' },
        { href: '/pricing', label: 'Pricing' },
      ]
    : MAIN_NAV.filter((n) => n.href !== '/landing');

  const linkClass = (href: string) => {
    const path = href.split('#')[0];
    const active = pathname === path || (path !== '/' && pathname.startsWith(path));
    return `px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      active
        ? 'text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10'
        : 'text-nisk-muted hover:text-white hover:bg-[var(--surface-elevated)]'
    }`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-nisk bg-nisk/90 backdrop-blur-xl">
      <div className="h-full max-w-[1600px] mx-auto px-4 flex items-center justify-between gap-4">
        <NiskBuildLogo href={user ? '/dashboard' : '/landing'} variant="full" size="sm" />

        <nav className="hidden md:flex items-center gap-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
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
            className="md:hidden p-2 text-nisk-muted hover:text-white"
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
        <div className="md:hidden border-t border-nisk bg-nisk-card px-4 py-3 space-y-1">
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
