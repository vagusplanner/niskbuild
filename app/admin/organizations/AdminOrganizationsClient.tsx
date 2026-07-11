'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminPlatformShell from '@/app/components/admin/AdminPlatformShell';

type Org = {
  id: string;
  name: string;
  billing_owner_id: string;
  dedicated_infra_interest: boolean;
  dedicated_infra_notes: string | null;
  created_at: string;
};

export default function AdminOrganizationsClient() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [interestOnly, setInterestOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const q = interestOnly ? '?interest=1' : '';
    const res = await fetch(`/api/admin/organizations${q}`, { credentials: 'include' });
    const data = await res.json();
    if (res.ok) {
      const list = (data.organizations || []) as Org[];
      setOrgs(list);
      const notes: Record<string, string> = {};
      for (const o of list) notes[o.id] = o.dedicated_infra_notes || '';
      setDraftNotes(notes);
    }
    setLoading(false);
  }, [interestOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (org: Org, interest: boolean) => {
    setSavingId(org.id);
    const res = await fetch(`/api/admin/organizations/${org.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dedicatedInfraInterest: interest,
        dedicatedInfraNotes: draftNotes[org.id] ?? '',
      }),
    });
    setSavingId(null);
    if (res.ok) await load();
    else {
      const data = await res.json();
      alert(data.error || 'Save failed');
    }
  };

  const interestedCount = orgs.filter((o) => o.dedicated_infra_interest).length;

  return (
    <AdminPlatformShell
      title="Organizations"
      description="Demand signal for dedicated infrastructure (Sovereign interest) — not provisioning"
      stats={[
        { label: 'Listed', value: orgs.length },
        { label: 'Interest flagged', value: interestedCount },
      ]}
    >
      <div className="flex flex-wrap gap-3 mb-6">
        <label className="flex items-center gap-2 text-sm text-nisk-muted">
          <input
            type="checkbox"
            checked={interestOnly}
            onChange={(e) => setInterestOnly(e.target.checked)}
          />
          Show interest only
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="px-3 py-1.5 rounded-lg border border-nisk text-xs"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-nisk-muted text-sm">Loading…</p>
      ) : (
        <div className="space-y-4">
          {orgs.map((org) => (
            <div
              key={org.id}
              className="bg-nisk-card border border-nisk rounded-xl p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--foreground)]">{org.name || 'Unnamed org'}</p>
                  <p className="text-[10px] text-nisk-muted font-mono mt-0.5">{org.id}</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={org.dedicated_infra_interest}
                    disabled={savingId === org.id}
                    onChange={(e) => void save(org, e.target.checked)}
                  />
                  Dedicated infra interest
                </label>
              </div>
              <textarea
                value={draftNotes[org.id] ?? ''}
                onChange={(e) =>
                  setDraftNotes((prev) => ({ ...prev, [org.id]: e.target.value }))
                }
                rows={2}
                placeholder="Internal note (prospect call, contract ask, etc.)"
                className="w-full px-3 py-2 rounded-lg bg-nisk border border-nisk text-sm"
              />
              <button
                type="button"
                disabled={savingId === org.id}
                onClick={() => void save(org, org.dedicated_infra_interest)}
                className="btn-secondary px-3 py-1.5 rounded-lg text-xs disabled:opacity-50"
              >
                {savingId === org.id ? 'Saving…' : 'Save notes'}
              </button>
            </div>
          ))}
          {orgs.length === 0 && (
            <p className="text-sm text-nisk-muted">No organizations found.</p>
          )}
        </div>
      )}
    </AdminPlatformShell>
  );
}
