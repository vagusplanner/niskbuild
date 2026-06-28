'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import AdminPlatformShell from '@/app/components/admin/AdminPlatformShell';
import type { EmailTemplateCatalogEntry } from '@/lib/email/template-registry';

type EmailSendRow = {
  id: string;
  userId: string;
  email: string;
  templateKey: string;
  subject: string | null;
  sentAt: string;
  openedAt: string | null;
  clickedAt: string | null;
  source: string | null;
  resendId: string | null;
};

export default function AdminEmailsClient() {
  const [sends, setSends] = useState<EmailSendRow[]>([]);
  const [templates, setTemplates] = useState<EmailTemplateCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [filterEmail, setFilterEmail] = useState('');
  const [sendEmail, setSendEmail] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [customHtml, setCustomHtml] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterEmail.trim()) params.set('email', filterEmail.trim());
    params.set('limit', '100');

    const res = await fetch(`/api/admin/emails?${params}`, { credentials: 'include' });
    const data = await res.json();
    if (res.ok) {
      setSends(data.sends ?? []);
      setTemplates(data.templates ?? []);
    }
    setLoading(false);
  }, [filterEmail]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadPreview = async (key: string) => {
    if (!key) {
      setPreviewHtml('');
      return;
    }
    const res = await fetch(`/api/admin/emails/preview?key=${encodeURIComponent(key)}`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok) {
      setPreviewHtml(data.html ?? '');
      if (!customSubject) setCustomSubject(data.subject ?? '');
    }
  };

  useEffect(() => {
    void loadPreview(selectedTemplate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate]);

  const resolveUserId = async (email: string): Promise<string | null> => {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email.trim())
      .maybeSingle();
    return data?.id ?? null;
  };

  const handleSend = async (force: boolean) => {
    setSending(true);
    setMessage(null);
    try {
      const userId = await resolveUserId(sendEmail);
      if (!userId) throw new Error('No user found for that email');

      const res = await fetch('/api/admin/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          templateKey: selectedTemplate || undefined,
          subject: customSubject || undefined,
          html: customHtml || previewHtml || undefined,
          force,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      setMessage(force ? 'Email sent (resend).' : 'Email sent.');
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminPlatformShell
      title="Email hub"
      description="View send history, preview templates, resend and personalize lifecycle emails"
      stats={[
        { label: 'Sends loaded', value: sends.length },
        { label: 'Templates', value: templates.length },
        { label: 'Opened tracked', value: sends.filter((s) => s.openedAt).length },
        { label: 'Clicked tracked', value: sends.filter((s) => s.clickedAt).length },
      ]}
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <Link
          href="/admin/revenue"
          className="px-4 py-2 rounded-lg border border-nisk text-sm hover:border-[var(--copper-primary)]/40"
        >
          ← Revenue
        </Link>
        <Link
          href="/admin/churn"
          className="px-4 py-2 rounded-lg border border-nisk text-sm hover:border-[var(--copper-primary)]/40"
        >
          Churn risk
        </Link>
      </div>

      {message && (
        <p className="mb-4 text-sm text-[var(--copper-melt)] bg-[var(--copper-primary)]/10 border border-[var(--copper-primary)]/30 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <section className="bg-nisk-card border border-nisk rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold">Send or resend</h2>
          <label className="block text-xs text-nisk-muted">
            Recipient email
            <input
              type="email"
              value={sendEmail}
              onChange={(e) => setSendEmail(e.target.value)}
              className="mt-1 w-full bg-[var(--code-bg)] border border-nisk rounded-lg px-3 py-2 text-sm"
              placeholder="user@example.com"
            />
          </label>
          <label className="block text-xs text-nisk-muted">
            Pre-done template
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="mt-1 w-full bg-[var(--code-bg)] border border-nisk rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— Custom HTML below —</option>
              {templates.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label} — {t.subject}
                </option>
              ))}
            </select>
          </label>
          {selectedTemplate && (
            <p className="text-[10px] text-nisk-muted">
              {templates.find((t) => t.key === selectedTemplate)?.description}
            </p>
          )}
          <label className="block text-xs text-nisk-muted">
            Subject (override)
            <input
              type="text"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              className="mt-1 w-full bg-[var(--code-bg)] border border-nisk rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-nisk-muted">
            HTML body (override — personalize here)
            <textarea
              value={customHtml}
              onChange={(e) => setCustomHtml(e.target.value)}
              rows={6}
              placeholder="Leave empty to use template preview HTML"
              className="mt-1 w-full bg-[var(--code-bg)] border border-nisk rounded-lg px-3 py-2 text-xs font-mono"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={sending || !sendEmail.trim()}
              onClick={() => void handleSend(false)}
              className="px-4 py-2 rounded-lg bg-[var(--copper-primary)] text-white text-sm disabled:opacity-50"
            >
              Send once
            </button>
            <button
              type="button"
              disabled={sending || !sendEmail.trim()}
              onClick={() => void handleSend(true)}
              className="px-4 py-2 rounded-lg border border-nisk text-sm disabled:opacity-50 hover:border-[var(--copper-primary)]/40"
            >
              Force resend
            </button>
          </div>
        </section>

        <section className="bg-nisk-card border border-nisk rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-2">Template preview</h2>
          {previewHtml ? (
            <div
              className="rounded-lg border border-nisk bg-white text-black p-4 text-sm max-h-80 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <p className="text-sm text-nisk-muted">Select a template to preview.</p>
          )}
        </section>
      </div>

      <section className="bg-nisk-card border border-nisk rounded-xl overflow-hidden">
        <div className="p-4 border-b border-nisk flex flex-wrap gap-3 items-end">
          <h2 className="text-sm font-semibold flex-1">Send history</h2>
          <input
            type="search"
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.target.value)}
            placeholder="Filter by email"
            className="bg-[var(--code-bg)] border border-nisk rounded-lg px-3 py-1.5 text-xs w-48"
          />
          <button
            type="button"
            onClick={() => void load()}
            className="px-3 py-1.5 rounded-lg border border-nisk text-xs hover:border-[var(--copper-primary)]/40"
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-nisk-muted text-center">Loading…</p>
        ) : sends.length === 0 ? (
          <p className="p-6 text-sm text-nisk-muted text-center">No emails logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface)]/50 border-b border-nisk">
                <tr>
                  <th className="text-left p-3 text-nisk-muted font-medium">Sent</th>
                  <th className="text-left p-3 text-nisk-muted font-medium">Email</th>
                  <th className="text-left p-3 text-nisk-muted font-medium">Template</th>
                  <th className="text-left p-3 text-nisk-muted font-medium">Subject</th>
                  <th className="text-left p-3 text-nisk-muted font-medium">Source</th>
                  <th className="text-left p-3 text-nisk-muted font-medium">Opened</th>
                  <th className="text-left p-3 text-nisk-muted font-medium">Clicked</th>
                </tr>
              </thead>
              <tbody>
                {sends.map((row) => (
                  <tr key={row.id} className="border-b border-nisk/60 hover:bg-[var(--surface)]/30">
                    <td className="p-3 text-xs text-nisk-muted whitespace-nowrap">
                      {new Date(row.sentAt).toLocaleString()}
                    </td>
                    <td className="p-3">{row.email}</td>
                    <td className="p-3 text-xs font-mono text-nisk-muted">{row.templateKey}</td>
                    <td className="p-3 text-xs max-w-[160px] truncate">{row.subject ?? '—'}</td>
                    <td className="p-3 text-xs">{row.source ?? 'system'}</td>
                    <td className="p-3 text-xs">{row.openedAt ? '✓' : '—'}</td>
                    <td className="p-3 text-xs">{row.clickedAt ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminPlatformShell>
  );
}
