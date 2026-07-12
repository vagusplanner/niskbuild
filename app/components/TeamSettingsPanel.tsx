'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { redirectToStripe } from '@/lib/checkout-redirect';
import {
  extraSeatMailtoHref,
} from '@/lib/extra-seats';

type SeatUsage = {
  used: number;
  limit: number;
  members: number;
  pendingInvites: number;
  remaining: number;
  atCapacity: boolean;
  overCapacity?: boolean;
  label: string;
};

type Member = {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  email: string | null;
  full_name: string | null;
};

type Invite = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
  pending: boolean;
};

type Org = {
  id: string;
  name: string;
  role: string;
  seats: SeatUsage;
  teamsEligible: boolean;
  members: Member[];
  invites: Invite[];
};

export default function TeamSettingsPanel() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [portalLoading, setPortalLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/settings/team', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to load team');
      setOrgs([]);
    } else {
      setOrgs(data.orgs ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openBillingPortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/dashboard/settings?tab=team`,
        }),
      });
      const data = await res.json();
      if (data.url) redirectToStripe(data.url);
      else throw new Error(data.error || 'Portal unavailable');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const post = async (body: Record<string, unknown>, busyKey: string) => {
    setBusy(busyKey);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/team', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      setMessage('Updated.');
      await load();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
      return null;
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-nisk-muted">Loading team…</p>;
  }

  if (orgs.length === 0) {
    return (
      <div className="rounded-xl border border-nisk bg-nisk-card p-5 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Team</h2>
        <p className="text-sm text-nisk-muted">
          Multi-seat teams are included on Agency Studio and above. Upgrade to invite teammates and
          share org projects.
        </p>
        <Link href="/pricing/compare" className="inline-flex text-sm text-[var(--copper-melt)] hover:underline">
          Compare plans →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {message && (
        <p className="text-sm rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-200">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200">
          {error}
        </p>
      )}

      {orgs.map((org) => {
        const canManage = org.role === 'owner' || org.role === 'admin';
        const isOwner = org.role === 'owner';
        return (
          <article key={org.id} className="rounded-xl border border-nisk bg-nisk-card p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">{org.name}</h2>
                <p className="text-xs text-nisk-muted mt-1">
                  Your role: {org.role} · {org.seats.label}
                </p>
              </div>
            </div>

            {!org.teamsEligible && (
              <p className="text-sm rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-100">
                {isOwner
                  ? 'Your plan no longer includes multi-seat teams. Members have read-only access to team projects until you restore Agency Studio or higher under Billing.'
                  : 'This team’s plan no longer includes multi-seat access. You can view team projects, but generation is paused. Contact the organization owner — only they can manage the team subscription.'}
              </p>
            )}

            {org.seats.overCapacity && (
              <p className="text-sm rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-100">
                {isOwner
                  ? `Seat overage: ${org.seats.members} members on a plan capped at ${org.seats.limit}. Existing members keep access; new invites are blocked until you remove seats or upgrade.`
                  : `This team is over its seat cap (${org.seats.members}/${org.seats.limit}). New invites are paused until the owner reduces seats or upgrades.`}
                {isOwner ? (
                  <>
                    {' '}
                    Need more seats? Additional seats are $39/month each —{' '}
                    <a
                      href={extraSeatMailtoHref()}
                      className="text-[var(--copper-melt)] underline underline-offset-2 hover:text-[var(--copper-light)]"
                    >
                      contact us
                    </a>{' '}
                    to add more, or use{' '}
                    <Link
                      href="/dashboard/support"
                      className="text-[var(--copper-melt)] underline underline-offset-2 hover:text-[var(--copper-light)]"
                    >
                      Support
                    </Link>
                    .
                  </>
                ) : null}
              </p>
            )}

            {isOwner ? (
              <p className="text-xs text-nisk-muted">
                Team billing uses your personal Agency+ subscription.{' '}
                <button
                  type="button"
                  onClick={() => void openBillingPortal()}
                  disabled={portalLoading}
                  className="text-[var(--copper-melt)] hover:underline disabled:opacity-50"
                >
                  {portalLoading ? 'Opening billing…' : 'Manage billing →'}
                </button>
              </p>
            ) : (
              <p className="text-xs text-nisk-muted">
                Only the organization owner can manage the team plan and Stripe billing. Admins can
                invite and manage members, but cannot open the billing portal for this subscription.
              </p>
            )}

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-nisk-muted">Members</h3>
              <ul className="space-y-2">
                {org.members.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-nisk bg-[var(--iron-dark)] px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="text-[var(--foreground)]">
                        {m.full_name || m.email || m.user_id}
                      </p>
                      <p className="text-xs text-nisk-muted">
                        {m.email} · {m.role} · joined {new Date(m.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                    {canManage && m.role !== 'owner' && (
                      <div className="flex flex-wrap gap-2">
                        {m.role === 'member' ? (
                          <button
                            type="button"
                            disabled={busy === `role-${m.user_id}`}
                            onClick={() =>
                              void post(
                                {
                                  action: 'update_role',
                                  orgId: org.id,
                                  memberUserId: m.user_id,
                                  role: 'admin',
                                },
                                `role-${m.user_id}`
                              )
                            }
                            className="text-xs text-[var(--copper-melt)] hover:underline disabled:opacity-50"
                          >
                            Make admin
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy === `role-${m.user_id}`}
                            onClick={() =>
                              void post(
                                {
                                  action: 'update_role',
                                  orgId: org.id,
                                  memberUserId: m.user_id,
                                  role: 'member',
                                },
                                `role-${m.user_id}`
                              )
                            }
                            className="text-xs text-[var(--copper-melt)] hover:underline disabled:opacity-50"
                          >
                            Make member
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy === `rm-${m.user_id}`}
                          onClick={() => {
                            if (!confirm(`Remove ${m.email || 'this member'} from the team?`)) return;
                            void post(
                              {
                                action: 'remove_member',
                                orgId: org.id,
                                memberUserId: m.user_id,
                              },
                              `rm-${m.user_id}`
                            );
                          }}
                          className="text-xs text-red-300 hover:underline disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-nisk-muted">
                Pending invites
              </h3>
              {org.invites.filter((i) => i.pending).length === 0 ? (
                <p className="text-xs text-nisk-muted">No pending invites.</p>
              ) : (
                <ul className="space-y-2">
                  {org.invites
                    .filter((i) => i.pending)
                    .map((inv) => (
                      <li
                        key={inv.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-nisk bg-[var(--iron-dark)] px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-mono text-[var(--copper-light)]">{inv.email}</p>
                          <p className="text-xs text-nisk-muted">
                            {inv.role} · expires {new Date(inv.expires_at).toLocaleString()}
                          </p>
                        </div>
                        {canManage && (
                          <button
                            type="button"
                            disabled={busy === `rev-${inv.id}`}
                            onClick={() =>
                              void post(
                                { action: 'revoke_invite', orgId: org.id, inviteId: inv.id },
                                `rev-${inv.id}`
                              )
                            }
                            className="text-xs text-red-300 hover:underline disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        )}
                      </li>
                    ))}
                </ul>
              )}
            </section>

            {canManage && (
              <section className="space-y-2 border-t border-nisk pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-nisk-muted">
                  Invite teammate
                </h3>
                <p className="text-xs text-nisk-muted">{org.seats.label}</p>
                {org.seats.atCapacity || org.seats.overCapacity ? (
                  <p className="text-xs text-amber-200">
                    {org.seats.overCapacity
                      ? `Seat overage (${org.seats.label}). Remove members or upgrade before inviting.`
                      : `Seat limit reached (${org.seats.label}). Remove a member or revoke a pending invite before inviting someone else.`}{' '}
                    Need more seats? Additional seats are $39/month each —{' '}
                    <a
                      href={extraSeatMailtoHref()}
                      className="text-[var(--copper-melt)] underline underline-offset-2 hover:text-[var(--copper-light)]"
                    >
                      contact us
                    </a>{' '}
                    to add more, or open{' '}
                    <Link
                      href="/dashboard/support"
                      className="text-[var(--copper-melt)] underline underline-offset-2 hover:text-[var(--copper-light)]"
                    >
                      Support
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teammate@company.com"
                      className="flex-1 rounded-lg border border-nisk bg-[var(--iron-dark)] px-3 py-2 text-sm text-[var(--foreground)]"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                      className="rounded-lg border border-nisk bg-[var(--iron-dark)] px-3 py-2 text-sm"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="button"
                      disabled={busy === 'invite' || !inviteEmail.trim()}
                      onClick={async () => {
                        const data = await post(
                          {
                            action: 'invite',
                            orgId: org.id,
                            email: inviteEmail,
                            role: inviteRole,
                          },
                          'invite'
                        );
                        if (data) {
                          setInviteEmail('');
                          setMessage('Invite sent.');
                        }
                      }}
                      className="rounded-lg btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      {busy === 'invite' ? 'Sending…' : 'Send invite'}
                    </button>
                  </div>
                )}
              </section>
            )}
          </article>
        );
      })}
    </div>
  );
}
