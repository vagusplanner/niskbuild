"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSafeSession } from '@/lib/supabaseSession';
import AuthButton from './AuthButton';
import NiskBuildLogo from './NiskBuildLogo';

interface User {
  id: string;
  email?: string;
}

interface Session {
  user: User | null;
}

interface AppMenuProps {
  variant?: 'builder' | 'app';
  showAuth?: boolean;
}

const BASE_NAV = [
  { href: '/builder', label: 'Builder' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/dashboard/settings', label: 'Settings' },
  { href: '/landing', label: 'Landing' },
];

const ADMIN_NAV = [
  { href: '/admin', label: 'Analytics' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/insights', label: 'Insights' },
];

export default function AppMenu({ variant = 'app', showAuth = true }: AppMenuProps) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();

    getSafeSession().then((session) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = user?.email === 'sofiane.kemih@gmail.com';
  const navItems = [...BASE_NAV];
  if (isAdmin) {
    navItems.push({ href: '/admin', label: 'Admin' });
  }

  const linkClass = (href: string) => {
    const active = pathname === href || (href !== '/builder' && pathname.startsWith(href));
    return `block px-3 py-2 text-sm rounded-lg transition-colors ${
      active
        ? 'bg-[var(--primary)]/15 text-[var(--primary)]'
        : 'text-gray-300 hover:text-white hover:bg-[var(--surface-elevated)]'
    }`;
  };

  return (
    <div
      ref={menuRef}
      className={`fixed z-50 ${variant === 'builder' ? 'top-3 left-3' : 'top-4 left-4'}`}
      onMouseEnter={() => variant === 'builder' && setOpen(true)}
      onMouseLeave={() => variant === 'builder' && setOpen(false)}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-[var(--card-bg)]/90 backdrop-blur-md border border-[var(--border)] rounded-xl px-3 py-2 shadow-lg hover:border-[var(--primary)]/40 transition-colors"
        aria-label="Open menu"
      >
        <NiskBuildLogo variant="full" size="micro" />
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-[var(--card-bg)]/95 backdrop-blur-md border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden">
          <nav className="p-2 space-y-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={linkClass(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {isAdmin && (
            <div className="px-2 pb-1 border-t border-[var(--border)] pt-1">
              <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-nisk-muted">Admin</p>
              {ADMIN_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={linkClass(item.href)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          {showAuth && variant !== 'builder' && (
            <AuthButton user={user} variant="menu" />
          )}
        </div>
      )}
    </div>
  );
}
