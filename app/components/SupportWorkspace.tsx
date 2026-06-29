'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSafeSession } from '@/lib/supabaseSession';
import ContactForm from '@/app/components/ContactForm';
import SupportAgentPanel from '@/app/components/SupportAgentPanel';
import { canUseSupportTickets } from '@/lib/support-access';
import { statusLabel, type SupportTicketStatus } from '@/lib/support-access';

type Ticket = {
  id: string;
  subject: string;
  category: string;
  status: SupportTicketStatus;
  priority: string;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  sender_type: 'user' | 'admin' | 'system';
  sender_email: string | null;
  body: string;
  created_at: string;
};

export default function SupportWorkspace() {
  const [tier, setTier] = useState('free');
  const [status, setStatus] = useState('inactive');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const hasTickets = canUseSupportTickets(tier, status);

  const loadTickets = useCallback(async () => {
    if (!hasTickets) {
      setLoading(false);
      return;
    }
    const res = await fetch('/api/support/tickets', { credentials: 'include' });
    const data = await res.json();
    if (res.ok) setTickets(data.tickets || []);
    setLoading(false);
  }, [hasTickets]);

  useEffect(() => {
    getSafeSession().then(async () => {
      const subRes = await fetch('/api/subscription/status', { credentials: 'include' });
      const sub = subRes.ok ? await subRes.json() : null;
      if (sub?.tier) {
        setTier(sub.tier);
        setStatus(sub.status ?? 'inactive');
      }
    });
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets, hasTickets]);

  const openTicket = async (id: string) => {
    setSelectedId(id);
    setShowNew(false);
    const res = await fetch(`/api/support/tickets/${id}`, { credentials: 'include' });
    const data = await res.json();
    if (res.ok) setMessages(data.messages || []);
  };

  const sendReply = async () => {
    if (!selectedId || !reply.trim()) return;
    setReplying(true);
    const res = await fetch(`/api/support/tickets/${selectedId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ message: reply }),
    });
    setReplying(false);
    if (res.ok) {
      setReply('');
      await openTicket(selectedId);
      await loadTickets();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Support</h1>
      <p className="text-nisk-muted text-sm mb-6">
        {hasTickets
          ? 'Priority support for Pro Worker plans and above — track replies here and by email.'
          : 'Free, Sandbox & Basic plans can use the contact form below. Upgrade to Pro Worker for ticket tracking.'}
      </p>

      <div className="mb-8">
        <SupportAgentPanel />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {hasTickets && (
          <div className="lg:col-span-2 space-y-3">
            <button
              type="button"
              onClick={() => {
                setShowNew(true);
                setSelectedId(null);
                setMessages([]);
              }}
              className="w-full btn-primary py-2.5 rounded-xl text-sm"
            >
              + New ticket
            </button>
            <div className="glass-panel rounded-xl overflow-hidden divide-y divide-[var(--border)]">
              {tickets.length === 0 ? (
                <p className="p-4 text-sm text-nisk-muted">No tickets yet</p>
              ) : (
                tickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => void openTicket(t.id)}
                    className={`w-full text-left p-4 hover:bg-[var(--surface-elevated)] transition-colors ${
                      selectedId === t.id ? 'bg-[var(--accent-cyan)]/10' : ''
                    }`}
                  >
                    <p className="text-sm font-medium truncate">{t.subject}</p>
                    <p className="text-[10px] text-nisk-muted mt-1">
                      {statusLabel(t.status)} · {new Date(t.updated_at).toLocaleDateString()}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className={`${hasTickets ? 'lg:col-span-3' : 'lg:col-span-5'} glass-panel rounded-2xl p-6`}>
          {showNew && hasTickets ? (
            <>
              <h2 className="text-lg font-semibold mb-4">New support ticket</h2>
              <ContactForm
                variant="compact"
                endpoint="/api/support/tickets"
                showCategory
                onSuccess={() => {
                  setShowNew(false);
                  void loadTickets();
                }}
              />
            </>
          ) : selectedId && hasTickets ? (
            <>
              <h2 className="text-lg font-semibold mb-4">Conversation</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl text-sm ${
                      m.sender_type === 'admin'
                        ? 'bg-[var(--primary)]/15 border border-[var(--primary)]/25 ml-4'
                        : m.sender_type === 'system'
                          ? 'bg-[var(--success)]/10 border border-[var(--success)]/20 text-center text-xs text-nisk-muted'
                          : 'bg-[var(--surface-elevated)] mr-4'
                    }`}
                  >
                    {m.sender_type === 'admin' && (
                      <p className="text-[10px] text-[var(--primary)] mb-1 font-medium">NiskBuild Support</p>
                    )}
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className="text-[10px] text-nisk-muted mt-1">
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={2}
                  placeholder="Reply…"
                  className="flex-1 px-3 py-2 rounded-xl glass-input text-sm resize-none"
                />
                <button
                  type="button"
                  onClick={() => void sendReply()}
                  disabled={replying || !reply.trim()}
                  className="btn-primary px-4 py-2 rounded-xl text-sm self-end disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </>
          ) : hasTickets ? (
            <p className="text-sm text-nisk-muted py-8 text-center">
              Select a ticket from the list, or click <strong>New ticket</strong> to open one.
            </p>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-2">Contact us</h2>
              <p className="text-sm text-nisk-muted mb-4">
                All messages go through our team — no public email needed. We reply within 1–2 business days.
              </p>
              <ContactForm variant="compact" endpoint="/api/support/contact" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
