"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/app/components/Layout';

type AdminUser = {
  id: string;
  email: string;
  subscription_tier: string;
  subscription_status: string;
  subscription_id?: string | null;
  admin_discount_percent?: number;
  admin_discount_note?: string | null;
  access_grant?: string | null;
  access_grant_tier?: string | null;
  access_grant_notes?: string | null;
  access_grant_expires_at?: string | null;
  project_count: number;
};

const COMPED_TIERS = [
  'basic',
  'pro',
  'agency',
  'scale',
  'white_label',
  'team_enterprise',
  'sovereign',
] as const;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [discountDraft, setDiscountDraft] = useState<Record<string, { percent: number; note: string }>>({});
  const [compedDraft, setCompedDraft] = useState<Record<string, { tier: string; notes: string }>>({});

  useEffect(() => {
    void fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users ?? []);
        const drafts: Record<string, { percent: number; note: string }> = {};
        const comped: Record<string, { tier: string; notes: string }> = {};
        for (const u of data.users ?? []) {
          drafts[u.id] = {
            percent: u.admin_discount_percent ?? 0,
            note: u.admin_discount_note ?? '',
          };
          comped[u.id] = {
            tier: u.access_grant_tier || 'pro',
            notes: u.access_grant_notes ?? '',
          };
        }
        setDiscountDraft(drafts);
        setCompedDraft(comped);
      } else {
        setUsers([]);
      }
    } catch {
      setUsers([]);
    }
    setLoading(false);
  };

  const updateUserTier = async (userId: string, newTier: string) => {
    setUpdating(userId);
    const res = await fetch(`/api/admin/users/${userId}/tier`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tier: newTier }),
    });
    const data = await res.json();
    setUpdating(null);

    if (res.ok) {
      const warning = data.stripeWarning ? `\n\nNote: ${data.stripeWarning}` : '';
      alert(`✅ User updated to ${newTier}${data.stripeSynced ? ' (Stripe synced)' : ''}${warning}`);
      void fetchUsers();
    } else {
      alert(data.error || 'Error updating user');
    }
  };

  const applyDiscount = async (userId: string) => {
    const draft = discountDraft[userId];
    if (!draft) return;
    setUpdating(userId);
    const res = await fetch(`/api/admin/users/${userId}/discount`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        discountPercent: draft.percent,
        discountNote: draft.note,
      }),
    });
    setUpdating(null);
    if (res.ok) {
      alert(`✅ Discount set to ${draft.percent}%`);
      fetchUsers();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to apply discount');
    }
  };

  const grantCompedAccess = async (userId: string) => {
    const draft = compedDraft[userId];
    if (!draft) return;
    setUpdating(userId);
    const res = await fetch(`/api/admin/users/${userId}/access-grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: 'grant',
        tier: draft.tier,
        notes: draft.notes || null,
      }),
    });
    const data = await res.json();
    setUpdating(null);
    if (res.ok) {
      alert(`✅ Comped ${draft.tier} access granted (no Stripe)`);
      void fetchUsers();
    } else {
      alert(data.error || 'Failed to grant comped access');
    }
  };

  const revokeCompedAccess = async (userId: string) => {
    if (!confirm('Revoke comped access and set this user to free?')) return;
    setUpdating(userId);
    const res = await fetch(`/api/admin/users/${userId}/access-grant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'revoke' }),
    });
    const data = await res.json();
    setUpdating(null);
    if (res.ok) {
      alert('✅ Comped access revoked');
      void fetchUsers();
    } else {
      alert(data.error || 'Failed to revoke comped access');
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-gray-500/20 text-gray-400';
      case 'basic': return 'bg-slate-500/20 text-slate-300';
      case 'pro': return 'bg-blue-500/20 text-blue-400';
      case 'agency': return 'bg-purple-500/20 text-purple-400';
      case 'scale': return 'bg-emerald-500/20 text-emerald-400';
      case 'white_label': return 'bg-yellow-500/20 text-yellow-400';
      case 'team_enterprise': return 'bg-orange-500/20 text-orange-400';
      case 'sovereign': return 'bg-rose-500/20 text-rose-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh] text-white">Loading admin panel...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 mt-1">Manage user subscriptions, discounts, and tiers</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/support" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm">
              Support
            </Link>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-nisk-card rounded-xl border border-nisk overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50 border-b border-gray-800">
                <tr>
                  <th className="text-left p-4 text-gray-300 font-medium">Email</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Current Tier</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Projects</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Status</th>
                  <th className="text-left p-4 text-gray-300 font-medium">
                    Paying discount
                    <span className="block text-[10px] font-normal text-gray-500 mt-0.5">
                      Stripe checkout only
                    </span>
                  </th>
                  <th className="text-left p-4 text-gray-300 font-medium">
                    Comped access
                    <span className="block text-[10px] font-normal text-gray-500 mt-0.5">
                      No Stripe
                    </span>
                  </th>
                  <th className="text-left p-4 text-gray-300 font-medium">Stripe tier sync</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isComped = user.access_grant === 'admin_comped';
                  const hasStripeSub = Boolean(user.subscription_id?.trim());
                  return (
                  <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="p-4 text-white">{user.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierBadgeColor(user.subscription_tier)}`}>
                        {user.subscription_tier || 'free'}
                      </span>
                      {isComped && (
                        <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-teal-500/20 text-teal-300">
                          comped {user.access_grant_tier || ''}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-300">{user.project_count}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${user.subscription_status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {user.subscription_status || 'active'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2 min-w-[180px]">
                        <p className="text-[10px] text-gray-500">For paying customers at checkout</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={discountDraft[user.id]?.percent ?? 0}
                            onChange={(e) =>
                              setDiscountDraft((prev) => ({
                                ...prev,
                                [user.id]: {
                                  percent: Number(e.target.value),
                                  note: prev[user.id]?.note ?? '',
                                },
                              }))
                            }
                            className="flex-1"
                          />
                          <span className="text-xs font-mono text-gray-300 w-10">
                            {discountDraft[user.id]?.percent ?? 0}%
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => void applyDiscount(user.id)}
                          disabled={updating === user.id}
                          className="px-2 py-1 text-xs rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50"
                        >
                          Apply discount
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <p className="text-[10px] text-gray-500">
                          Grant comped access (no Stripe). Refused if subscription_id is set.
                        </p>
                        {hasStripeSub && (
                          <p className="text-[10px] text-amber-400">
                            Has Stripe sub — clear it before granting
                          </p>
                        )}
                        <select
                          value={compedDraft[user.id]?.tier ?? 'pro'}
                          onChange={(e) =>
                            setCompedDraft((prev) => ({
                              ...prev,
                              [user.id]: {
                                tier: e.target.value,
                                notes: prev[user.id]?.notes ?? '',
                              },
                            }))
                          }
                          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                        >
                          {COMPED_TIERS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Notes (optional)"
                          value={compedDraft[user.id]?.notes ?? ''}
                          onChange={(e) =>
                            setCompedDraft((prev) => ({
                              ...prev,
                              [user.id]: {
                                tier: prev[user.id]?.tier ?? 'pro',
                                notes: e.target.value,
                              },
                            }))
                          }
                          className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                        />
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => void grantCompedAccess(user.id)}
                            disabled={updating === user.id || hasStripeSub}
                            className="px-2 py-1 text-xs rounded-lg bg-teal-700 hover:bg-teal-600 text-white disabled:opacity-50"
                          >
                            Grant comped access (no Stripe)
                          </button>
                          {isComped && (
                            <button
                              type="button"
                              onClick={() => void revokeCompedAccess(user.id)}
                              disabled={updating === user.id}
                              className="px-2 py-1 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50"
                            >
                              Revoke comped
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 flex-wrap">
                        <p className="w-full text-[10px] text-gray-500 mb-1">
                          Syncs Stripe when subscription_id exists
                        </p>
                        <button
                          onClick={() => updateUserTier(user.id, 'free')}
                          disabled={updating === user.id}
                          className="px-3 py-1 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50"
                        >
                          Free
                        </button>
                        <button
                          onClick={() => updateUserTier(user.id, 'basic')}
                          disabled={updating === user.id}
                          className="px-3 py-1 text-xs rounded-lg bg-slate-600 hover:bg-slate-500 text-white transition-colors disabled:opacity-50"
                        >
                          Basic ($69)
                        </button>
                        <button
                          onClick={() => updateUserTier(user.id, 'pro')}
                          disabled={updating === user.id}
                          className="px-3 py-1 text-xs rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                        >
                          Pro ($129)
                        </button>
                        <button
                          onClick={() => updateUserTier(user.id, 'agency')}
                          disabled={updating === user.id}
                          className="px-3 py-1 text-xs rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50"
                        >
                          Agency ($299)
                        </button>
                        <button
                          onClick={() => updateUserTier(user.id, 'scale')}
                          disabled={updating === user.id}
                          className="px-3 py-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                        >
                          Scale ($799)
                        </button>
                        <button
                          onClick={() => updateUserTier(user.id, 'white_label')}
                          disabled={updating === user.id}
                          className="px-3 py-1 text-xs rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white transition-colors disabled:opacity-50"
                        >
                          White ($1,199)
                        </button>
                        <button
                          onClick={() => updateUserTier(user.id, 'team_enterprise')}
                          disabled={updating === user.id}
                          className="px-3 py-1 text-xs rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors disabled:opacity-50"
                        >
                          Team ($1,999)
                        </button>
                        <button
                          onClick={() => updateUserTier(user.id, 'sovereign')}
                          disabled={updating === user.id}
                          className="px-3 py-1 text-xs rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50"
                        >
                          Sovereign ($3,999)
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-center text-gray-500 text-xs">
          <p>Admin access restricted</p>
        </div>
      </div>
    </Layout>
  );
}
