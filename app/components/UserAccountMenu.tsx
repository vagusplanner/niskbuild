"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut } from '@/lib/auth';
import { openDocsPanel } from '@/lib/docs-panel-events';

interface UserAccountMenuProps {
  user: { email?: string };
  /** Prefer profiles.full_name when available; email local-part is fallback only. */
  fullName?: string;
  avatarUrl?: string;
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

const linkClass =
  'block px-4 py-2 text-sm text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]';

export default function UserAccountMenu({
  user,
  fullName = '',
  avatarUrl = '',
  subscriptionTier = 'free',
  subscriptionStatus = 'inactive',
  restricted = false,
}: UserAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [resolvedFullName, setResolvedFullName] = useState(fullName);
  const [resolvedAvatar, setResolvedAvatar] = useState(avatarUrl);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setResolvedFullName(fullName);
  }, [fullName]);

  useEffect(() => {
    setResolvedAvatar(avatarUrl);
  }, [avatarUrl]);

  useEffect(() => {
    if (fullName.trim() && avatarUrl) return;
    let cancelled = false;
    fetch('/api/settings/profile', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.profile) return;
        const name =
          typeof d.profile.full_name === 'string' ? d.profile.full_name.trim() : '';
        if (name && !fullName.trim()) setResolvedFullName(name);
        const av =
          typeof d.profile.avatar_url === 'string' ? d.profile.avatar_url.trim() : '';
        if (av && !avatarUrl) setResolvedAvatar(av);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fullName, avatarUrl]);

  const displayName = resolveDisplayName(resolvedFullName, user.email);
  const initial = displayName.charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAdvancedOpen(false);
      }
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
        className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-[var(--copper-dark)] to-[var(--copper-primary)] text-[var(--foreground)] text-sm font-bold border-2 border-[var(--copper-primary)]/40 hover:border-[var(--copper-melt)] shadow-[0_2px_8px_var(--copper-glow)] transition-all overflow-hidden"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {resolvedAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolvedAvatar} alt="" className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-nisk bg-[var(--card-bg)] shadow-2xl py-1 overflow-hidden">
          <div className="px-4 py-3 border-b border-nisk flex items-start gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-[var(--copper-dark)] to-[var(--copper-primary)] flex items-center justify-center text-sm font-bold border border-[var(--copper-primary)]/40">
              {resolvedAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolvedAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0 flex-1">
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
          </div>

          {!restricted ? (
            <nav className="py-1">
              <Link href="/dashboard" className={linkClass} onClick={() => setOpen(false)}>
                Dashboard
              </Link>
              <Link
                href="/dashboard/settings?tab=profile"
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                Profile &amp; preferences
              </Link>
              <Link
                href="/dashboard/settings?tab=security"
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                Security &amp; sessions
              </Link>
              <Link
                href="/dashboard/settings?tab=team"
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                Team
              </Link>
              <Link
                href="/dashboard/settings?tab=billing"
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                Billing &amp; plans
              </Link>
              <div className="border-t border-nisk my-1" />
              <button
                type="button"
                className={`${linkClass} w-full text-left`}
                onClick={() => {
                  setOpen(false);
                  openDocsPanel();
                }}
              >
                Help &amp; docs
              </button>
              <Link
                href="/dashboard/support"
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                Support
              </Link>
              <Link href="/tips" className={linkClass} onClick={() => setOpen(false)}>
                Tips
              </Link>
              <div className="border-t border-nisk my-1" />
              <button
                type="button"
                className={`${linkClass} w-full text-left flex items-center justify-between`}
                onClick={() => setAdvancedOpen((v) => !v)}
                aria-expanded={advancedOpen}
              >
                Advanced
                <span className="text-[10px] opacity-70">{advancedOpen ? '▴' : '▾'}</span>
              </button>
              {advancedOpen ? (
                <div className="pb-1">
                  <Link
                    href="/dashboard/settings?tab=domains"
                    className={`${linkClass} ps-6`}
                    onClick={() => setOpen(false)}
                  >
                    Domains
                  </Link>
                  <Link
                    href="/settings/github"
                    className={`${linkClass} ps-6`}
                    onClick={() => setOpen(false)}
                  >
                    GitHub
                  </Link>
                  <Link
                    href="/dashboard/settings?tab=danger"
                    className={`${linkClass} ps-6`}
                    onClick={() => setOpen(false)}
                  >
                    Danger zone
                  </Link>
                </div>
              ) : null}
            </nav>
          ) : (
            <nav className="py-1">
              <Link
                href="/dashboard/settings?tab=profile"
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                Profile &amp; preferences
              </Link>
              <Link
                href="/dashboard/settings?tab=billing"
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                Billing &amp; plans
              </Link>
              <Link href="/pricing" className={linkClass} onClick={() => setOpen(false)}>
                Pricing
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
