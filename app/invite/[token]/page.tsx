'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getSafeSession } from '@/lib/supabaseSession';

type Preview =
  | {
      status: 'pending';
      orgName: string;
      role: string;
      email: string;
      expiresAt: string;
      inviterName: string | null;
    }
  | { status: 'expired'; orgName: string | null }
  | { status: 'revoked'; orgName: string | null }
  | { status: 'accepted'; orgName: string | null }
  | { status: 'not_found' };

export default function AcceptInvitePage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';
  const [preview, setPreview] = useState<Preview | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [visibilityAcknowledged, setVisibilityAcknowledged] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await getSafeSession();
      setSignedIn(Boolean(session?.user));
      setSessionEmail(session?.user?.email ?? null);

      const res = await fetch(`/api/invite/${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load invite');
      setPreview(data.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invite');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) void load();
  }, [token, load]);

  const accept = async () => {
    if (!visibilityAcknowledged) {
      setError('Please acknowledge the team visibility notice before accepting.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/invite/${encodeURIComponent(token)}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not accept invite');
      setSuccess(`You joined ${data.orgName}. Open Settings → Team to see your teammates.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept invite');
    } finally {
      setBusy(false);
    }
  };

  const nextPath = `/invite/${token}`;
  const emailMatches =
    preview?.status === 'pending' &&
    sessionEmail &&
    sessionEmail.trim().toLowerCase() === preview.email.trim().toLowerCase();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-nisk bg-nisk-card p-6 space-y-4">
        <h1 className="text-xl font-semibold">Team invite</h1>

        {loading && <p className="text-sm text-nisk-muted">Loading invite…</p>}

        {!loading && preview?.status === 'not_found' && (
          <p className="text-sm text-red-300">This invite link is invalid or no longer exists.</p>
        )}
        {!loading && preview?.status === 'expired' && (
          <p className="text-sm text-amber-200">
            This invite{preview.orgName ? ` for ${preview.orgName}` : ''} has expired. Ask your
            team admin to send a new one.
          </p>
        )}
        {!loading && preview?.status === 'revoked' && (
          <p className="text-sm text-amber-200">
            This invite{preview.orgName ? ` for ${preview.orgName}` : ''} was revoked.
          </p>
        )}
        {!loading && preview?.status === 'accepted' && (
          <p className="text-sm text-emerald-200">
            This invite{preview.orgName ? ` for ${preview.orgName}` : ''} was already accepted.
            {signedIn ? (
              <>
                {' '}
                <Link href="/dashboard/settings?tab=team" className="underline text-[var(--copper-melt)]">
                  Open Team settings
                </Link>
              </>
            ) : null}
          </p>
        )}

        {!loading && preview?.status === 'pending' && (
          <div className="space-y-3 text-sm">
            <p className="text-nisk-muted">
              <strong className="text-[var(--foreground)]">{preview.inviterName || 'A teammate'}</strong>{' '}
              invited you to join <strong className="text-[var(--foreground)]">{preview.orgName}</strong>{' '}
              as <strong className="text-[var(--foreground)]">{preview.role}</strong>.
            </p>
            <p className="text-xs text-nisk-muted">
              Invited email: <span className="font-mono text-[var(--copper-light)]">{preview.email}</span>
              <br />
              Expires {new Date(preview.expiresAt).toLocaleString()}
            </p>

            {!signedIn && (
              <div className="space-y-2 rounded-lg border border-nisk bg-[var(--iron-dark)] p-3">
                <p className="text-nisk-muted">Sign in or create an account with that email to accept.</p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/login?next=${encodeURIComponent(nextPath)}`}
                    className="rounded-lg btn-primary px-3 py-1.5 text-xs font-semibold"
                  >
                    Sign in
                  </Link>
                  <Link
                    href={`/signup?next=${encodeURIComponent(nextPath)}`}
                    className="rounded-lg border border-nisk px-3 py-1.5 text-xs text-nisk-muted hover:text-white"
                  >
                    Sign up
                  </Link>
                </div>
              </div>
            )}

            {signedIn && !emailMatches && (
              <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100">
                <p>
                  You are signed in as <span className="font-mono">{sessionEmail}</span>, but this
                  invite is for <span className="font-mono">{preview.email}</span>.
                </p>
                <Link
                  href={`/login?next=${encodeURIComponent(nextPath)}`}
                  className="inline-flex text-xs underline text-[var(--copper-melt)]"
                >
                  Sign in with the invited email
                </Link>
              </div>
            )}

            {signedIn && emailMatches && !success && (
              <div className="space-y-3">
                <label className="flex items-start gap-3 rounded-lg border border-nisk bg-[var(--iron-dark)] p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibilityAcknowledged}
                    onChange={(e) => setVisibilityAcknowledged(e.target.checked)}
                    className="mt-0.5 rounded border-nisk"
                  />
                  <span className="text-xs text-nisk-muted leading-relaxed">
                    Joining this organization gives its owners and admins visibility into projects
                    created within it — including their prompts and generated code. Personal
                    projects outside this organization stay private to you.
                    <span className="block mt-1 opacity-70">
                      (Wording subject to final legal review.)
                    </span>
                  </span>
                </label>
                <button
                  type="button"
                  disabled={busy || !visibilityAcknowledged}
                  onClick={() => void accept()}
                  className="rounded-lg btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {busy ? 'Joining…' : 'Accept invite'}
                </button>
              </div>
            )}
          </div>
        )}

        {success && (
          <p className="text-sm rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-200">
            {success}{' '}
            <Link href="/dashboard/settings?tab=team" className="underline">
              Go to Team
            </Link>
          </p>
        )}
        {error && (
          <p className="text-sm rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200">
            {error}
          </p>
        )}

        <p className="text-xs text-nisk-muted pt-2">
          <Link href="/" className="hover:underline">
            ← NiskBuild home
          </Link>
        </p>
      </div>
    </div>
  );
}
