"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut } from '@/lib/auth';

interface UserAccountMenuProps {
  user: { email?: string };
  /** Prefer profiles.full_name when available; email local-part is fallback only. */
  fullName?: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
  restricted?: boolean;
}

function tierLabel(tier: string, status: string) {
  if (tier === 'free' || status !== 'active') return 'Free · choose a plan';
  return `${tier.replace(/_/g, ' ')} · active`;
}

function resolveDisplayName(fullName: string | undefined, email: string | undefined): string {
  const trimmed = fullName?.trim();
  if (trimmed) return trimmed;
  const local = email?.split('@')[0]?.trim();
  if (local) return local;
  return 'Account';
}

export default function UserAccountMenu({
  user,
  fullName = '',
  subscriptionTier = 'free',
  subscriptionStatus = 'inactive',
  restricted = false,
}: UserAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [resolvedFullName, setResolvedFullName] = useState(fullName);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setResolvedFullName(fullName);
  }, [fullName]);

  useEffect(() => {
    if (fullName.trim()) return;
    let cancelled = false;
    fetch('/api/settings/profile', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const name =
          typeof d?.profile?.full_name === 'string' ? d.profile.full_name.trim() : '';
        if (!cancelled && name) setResolvedFullName(name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fullName]);

  const displayName = resolveDisplayName(resolvedFullName, user.email);
  const initial = displayName.charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const paid = subscriptionStatus === 'active' && subscriptionTier !== 'free';

  return (
    <div className="relative z-[60]" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-[var(--copper-dark)] to-[var(--copper-primary)] text-[var(--foreground)] text-sm font-bold border-2 border-[var(--copper-primary)]/40 hover:border-[var(--copper-melt)] shadow-[0_2px_8px_var(--copper-glow)] transition-all"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-nisk bg-[var(--card-bg)] shadow-2xl py-1 overflow-hidden">
          <div className="px-4 py-3 border-b border-nisk">
            <p className="text-sm font-semibold text-[var(--foreground)] truncate">{displayName}</p>
            <p className="text-[10px] text-nisk-muted truncate">{user.email}</p>
            <p
              className={`text-[10px] mt-1 capitalize ${
                paid ? 'text-[var(--copper-melt)]' : 'text-nisk-muted'
              }`}
            >
              {tierLabel(subscriptionTier, subscriptionStatus)}
            </p>
          </div>
          {!restricted && (
            <nav className="py-1">
              <Link
                href="/dashboard"
                className="block px-4 py-2 text-sm text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                onClick={() => setOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/settings"
                className="block px-4 py-2 text-sm text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                onClick={() => setOpen(false)}
              >
                Settings
              </Link>
              <Link
                href="/pricing"
                className="block px-4 py-2 text-sm text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                onClick={() => setOpen(false)}
              >
                Billing & plans
              </Link>
              <Link
                href="/dashboard/support"
                className="block px-4 py-2 text-sm text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                onClick={() => setOpen(false)}
              >
                Support
              </Link>
            </nav>
          )}
          <div className="border-t border-nisk py-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="w-full text-left px-4 py-2 text-sm text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
