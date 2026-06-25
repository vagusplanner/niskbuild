"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePlatformOwner } from '@/lib/use-platform-owner';
import { getSafeSession } from '@/lib/supabaseSession';
import { openCommandPalette } from '@/lib/command-palette-events';
import { modKey } from '@/lib/keyboard';
import NiskBuildLogo from './NiskBuildLogo';
import UserAccountMenu from './UserAccountMenu';
import ThemeToggle from './ThemeToggle';
import { WORKSPACE_NAV, DISCOVER_NAV, APP_NAV, type NavItem } from '@/lib/nav-config';
import { MARKETING_NAV } from '@/lib/landing-nav';

/** Platform-owner admin — 3-layer architecture control */
const PLATFORM_ADMIN_NAV: NavItem[] = [
  {
    href: '/admin/layer-overview',
    label: '3-Layer Dashboard',
    icon: '📊',
    description: 'Public · Firstparty · Marketplace overview',
  },
  { href: '/admin/tenants', label: 'Tenants', icon: '👥', description: 'Subscriber layer' },
  { href: '/admin/apps', label: 'Apps', icon: '📱', description: 'Firstparty app registry' },
  {
    href: '/admin/marketplace',
    label: 'Listings',
    icon: '🏪',
    description: 'Marketplace moderation',
  },
  {
    href: '/builder/vagus-planner',
    label: 'VP Studio',
    icon: '🛠️',
    description: 'Edit Vagus Planner with AI',
  },
];

/** Logged-out visitors on app pages */
const GUEST_NAV: NavItem[] = [
  { href: '/landing', label: 'Home', icon: '🏠' },
  { href: '/pricing', label: 'Pricing', icon: '💳' },
];

export interface NavBarProps {
  variant?: 'marketing' | 'app' | 'builder';
}

export default function NavBar({ variant = 'app' }: NavBarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getSafeSession().then((s) => {
      setUser(s?.user ?? null);
      if (s?.user) {
        fetch('/api/subscription/status', { credentials: 'include' })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.tier) setSubscriptionTier(d.tier);
            if (d?.status) setSubscriptionStatus(d.status);
          })
          .catch(() => {});
      }
    });
  }, []);

  const isPlatformOwnerNav = usePlatformOwner(user);

  const nav = useMemo(() => {
    if (variant === 'marketing') {
      return MARKETING_NAV.map((item) => ({
        ...item,
        icon: '',
        description: undefined,
      }));
    }

    if (!user) {
      return GUEST_NAV;
    }

    return [...WORKSPACE_NAV, ...DISCOVER_NAV, ...APP_NAV.filter((n) => n.href !== '/landing')];
  }, [variant, user]);

  const isNavActive = (href: string) => {
    const path = href.split('#')[0];
    if (path === '/dashboard') return pathname === '/dashboard';
    if (path === '/admin/layer-overview') return pathname.startsWith('/admin');
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const linkClass = (href: string) => {
    const base =
      'px-3 py-2 text-sm font-semibold transition-all border-2 border-transparent text-nisk-muted hover:text-[var(--copper-melt)] hover:border-[var(--copper-primary)]/40 hover:bg-[var(--surface)]';
    if (!mounted) return base;
    return isNavActive(href)
      ? 'px-3 py-2 text-sm font-semibold transition-all border-2 border-[var(--copper-primary)] bg-[var(--copper-primary)]/15 text-[var(--copper-melt)] shadow-[3px_3px_0_var(--copper-glow)]'
      : base;
  };

  const isBuilder = variant === 'builder';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 glass-nav forge-plate">
      <div className="h-full max-w-[1800px] mx-auto px-4 flex items-center justify-between gap-4">
        <NiskBuildLogo
          href={user ? '/dashboard' : '/landing'}
          variant="lockup"
          size="sm"
        />

        {!isBuilder && (
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                {item.label}
              </Link>
            ))}

            {isPlatformOwnerNav && variant !== 'marketing' && (
              <div className="relative ml-1 z-[60]">
                <button
                  type="button"
                  onClick={() => setAdminOpen((v) => !v)}
                  className={`${linkClass('/admin/layer-overview')} flex items-center gap-1`}
                  aria-expanded={adminOpen}
                  aria-haspopup="true"
                >
                  Admin
                  <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {adminOpen && (
                  <div className="absolute top-full left-0 mt-1 min-w-[220px] py-1 rounded-xl border border-nisk bg-[var(--card-bg)] shadow-xl z-50">
                    {PLATFORM_ADMIN_NAV.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-2.5 text-sm text-nisk-muted hover:text-[var(--copper-melt)] hover:bg-[var(--surface)] transition-colors"
                        onClick={() => setAdminOpen(false)}
                      >
                        <span className="mr-2">{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
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
          {(variant === 'app' || isBuilder) && user && (
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
            <UserAccountMenu
              user={user}
              subscriptionTier={subscriptionTier}
              subscriptionStatus={subscriptionStatus}
            />
          ) : variant === 'marketing' ? (
            <Link href="/login" className="btn-primary text-sm px-4 py-2">
              Get Started
            </Link>
          ) : (
            <Link href="/login" className="btn-primary text-sm px-4 py-2">
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
          {isPlatformOwnerNav && variant !== 'marketing' && (
            <>
              <p className="px-3 pt-2 text-[10px] uppercase tracking-wider text-nisk-muted">Admin</p>
              {PLATFORM_ADMIN_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={linkClass(item.href)}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon} {item.label}
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </header>
  );
}
