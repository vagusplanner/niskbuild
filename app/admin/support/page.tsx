'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getSafeSession } from '@/lib/supabaseSession';
import { isPlatformOwnerClient } from '@/lib/platform-owner-client';
import Layout from '@/app/components/Layout';
import { statusLabel, type SupportTicketStatus } from '@/lib/support-access';

type Ticket = {
  id: string;
  user_id: string | null;
  email: string;
  name: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  plan_tier: string | null;
  source: string;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  sender_type: string;
  sender_email: string | null;
  body: string;
  created_at: string;
};

type UserProfile = {
  id: string;
  email: string;
  subscription_tier: string;
  admin_discount_percent: number;
  admin_discount_note: string | null;
};

export default function AdminSupportPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [reply, setReply] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountNote, setDiscountNote] = useState('');
  const [status, setStatus] = useState('in_progress');
  const [sending, setSending] = useState(false);

  const loadTickets = useCallback(async (statusFilter: string) => {
    const q = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
    const res = await fetch(`/api/admin/support/tickets${q}`, { credentials: 'include' });
    const data = await res.json();
    if (res.ok) setTickets(data.tickets || []);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const s = await getSafeSession();
      if (!s?.user) {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      const owner = await isPlatformOwnerClient();
      setAuthorized(owner);
      setLoading(false);
      if (owner) void loadTickets('all');
    };
    void checkAuth();
  }, [loadTickets]);

  const openTicket = async (id: string) => {
    setSelectedId(id);
    const res = await fetch(`/api/admin/support/tickets/${id}`, { credentials: 'include' });
    const data = await res.json();
    if (res.ok) {
      setMessages(data.messages || []);
      setUser(data.user || null);
      setDiscountPercent(data.user?.admin_discount_percent ?? 0);
      setDiscountNote(data.user?.admin_discount_note ?? '');
      setStatus(data.ticket?.status === 'open' ? 'in_progress' : data.ticket?.status || 'in_progress');
    }
  };

  const sendReply = async () => {
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    const res = await fetch(`/api/admin/support/tickets/${selectedId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        reply,
        discountPercent,
        discountNote,
        status,
      }),
    });
    setSending(false);
    if (res.ok) {
      setReply('');
      await openTicket(selectedId);
      await loadTickets(filter);
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to send');
    }
  };

  const applyDiscountOnly = async () => {
    if (!user?.id) return alert('No linked user account for this ticket');
    const res = await fetch(`/api/admin/users/${user.id}/discount`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ discountPercent, discountNote }),
    });
    if (res.ok) alert(`Discount set to ${discountPercent}%`);
    else alert('Failed to apply discount');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20 text-nisk-muted">Loading…</div>
      </Layout>
    );
  }

  if (!authorized) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-xl font-bold text-[var(--error)]">Unauthorized</h1>
          <p className="text-nisk-muted mt-2">Admin access only</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showFooter={false}>
      <div className="max-w-7xl mx-auto py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Support tickets</h1>
            <p className="text-sm text-nisk-muted">Reply by email · manage discounts · resolve issues</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin" className="btn-secondary px-3 py-2 rounded-lg text-sm">
              ← Admin
            </Link>
            <Link href="/admin/users" className="btn-secondary px-3 py-2 rounded-lg text-sm">
              Users
            </Link>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {['all', 'open', 'in_progress', 'resolved', 'closed'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setFilter(s);
                void loadTickets(s);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize ${
                filter === s ? 'bg-[var(--primary)] text-white' : 'glass-panel text-nisk-muted'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 glass-panel rounded-xl max-h-[70vh] overflow-y-auto divide-y divide-[var(--border)]">
            {tickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => void openTicket(t.id)}
                className={`w-full text-left p-4 hover:bg-[var(--surface-elevated)] ${
                  selectedId === t.id ? 'bg-[var(--primary)]/10' : ''
                }`}
              >
                <p className="text-sm font-medium truncate">{t.subject}</p>
                <p className="text-xs text-nisk-muted truncate">{t.email}</p>
                <p className="text-[10px] text-nisk-muted mt-1">
                  {statusLabel(t.status as SupportTicketStatus)} · {t.plan_tier || t.source}
                </p>
              </button>
            ))}
            {tickets.length === 0 && (
              <p className="p-4 text-sm text-nisk-muted">No tickets</p>
            )}
          </div>

          <div className="lg:col-span-3 glass-panel rounded-xl p-5">
            {!selectedId ? (
              <p className="text-nisk-muted text-sm">Select a ticket to view and reply</p>
            ) : (
              <>
                <div className="mb-4 pb-4 border-b border-[var(--border)]">
                  <h2 className="font-semibold">{tickets.find((t) => t.id === selectedId)?.subject}</h2>
                  <p className="text-xs text-nisk-muted mt-1">
                    {tickets.find((t) => t.id === selectedId)?.email} ·{' '}
                    {tickets.find((t) => t.id === selectedId)?.category}
                  </p>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-lg text-sm ${
                        m.sender_type === 'admin'
                          ? 'bg-[var(--primary)]/15 ml-6'
                          : m.sender_type === 'system'
                            ? 'bg-[var(--success)]/10 text-xs text-center text-nisk-muted'
                            : 'bg-[var(--surface-elevated)] mr-6'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className="text-[10px] text-nisk-muted mt-1">
                        {m.sender_type} · {new Date(m.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                {user && (
                  <div className="mb-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)]">
                    <p className="text-xs font-medium mb-2">User discount (0–100%)</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(Number(e.target.value))}
                        className="flex-1 min-w-[120px]"
                      />
                      <span className="text-sm font-mono w-12">{discountPercent}%</span>
                      <input
                        value={discountNote}
                        onChange={(e) => setDiscountNote(e.target.value)}
                        placeholder="Discount note (optional)"
                        className="flex-1 min-w-[160px] px-3 py-1.5 rounded-lg glass-input text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => void applyDiscountOnly()}
                        className="btn-secondary px-3 py-1.5 rounded-lg text-xs"
                      >
                        Apply only
                      </button>
                    </div>
                    <p className="text-[10px] text-nisk-muted mt-2">
                      Applied at checkout for {user.email} ({user.subscription_tier})
                    </p>
                  </div>
                )}

                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  placeholder="Type your reply — user receives a branded email…"
                  className="w-full px-3 py-2 rounded-xl glass-input text-sm resize-none mb-3"
                />

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="px-3 py-2 rounded-lg glass-input text-sm"
                  >
                    <option value="in_progress">In progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                    <option value="open">Re-open</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void sendReply()}
                    disabled={sending || !reply.trim()}
                    className="btn-primary px-5 py-2 rounded-xl text-sm disabled:opacity-50"
                  >
                    {sending ? 'Sending…' : 'Send reply + email'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
