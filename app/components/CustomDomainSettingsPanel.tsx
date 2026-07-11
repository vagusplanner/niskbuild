'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type DomainInstructions = {
  txtHost: string;
  txtType: string;
  txtValue: string;
  cnameHost: string;
  cnameType: string;
  cnameTarget: string;
  notes: string[];
};

type DomainRow = {
  id: string;
  hostname: string;
  status: string;
  verification_token: string;
  vercel_attached: boolean;
  last_error: string | null;
  verified_at: string | null;
  instructions: DomainInstructions;
};

function statusLabel(status: string) {
  switch (status) {
    case 'active':
      return { text: 'Active', className: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' };
    case 'dns_verified':
      return {
        text: 'DNS verified',
        className: 'text-[var(--copper-melt)] border-[var(--copper-primary)]/35 bg-[var(--copper-primary)]/10',
      };
    case 'failed':
      return { text: 'Verify failed', className: 'text-red-300 border-red-500/30 bg-red-500/10' };
    default:
      return { text: 'Pending DNS', className: 'text-nisk-muted border-nisk bg-[var(--surface)]' };
  }
}

export default function CustomDomainSettingsPanel() {
  const [eligible, setEligible] = useState(false);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [meta, setMeta] = useState<{ vercelConfigured: boolean; cnameTarget: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hostname, setHostname] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/settings/custom-domain', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to load domains');
      setDomains([]);
      setEligible(false);
    } else {
      setEligible(Boolean(data.eligible));
      setDomains(data.domains ?? []);
      setMeta(data.meta ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const claim = async () => {
    setBusy('claim');
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/custom-domain', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add domain');
      setHostname('');
      setMessage('Domain added — create the TXT record below, then click Verify.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setBusy(null);
    }
  };

  const verify = async (id: string) => {
    setBusy(`verify-${id}`);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/custom-domain', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'verify' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      if (data.domain?.status === 'failed') {
        setError(data.domain.last_error || 'DNS verification failed');
      } else if (data.domain?.status === 'active') {
        setMessage('Domain verified and active. SSL attach succeeded (or domain already on Vercel).');
      } else if (data.domain?.status === 'dns_verified') {
        setMessage(
          data.vercel?.reason ||
            'DNS ownership verified. Add the CNAME (and Vercel project domain) for traffic + SSL.'
        );
      } else {
        setMessage('Updated.');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this custom domain?')) return;
    setBusy(`remove-${id}`);
    setError(null);
    try {
      const res = await fetch(`/api/settings/custom-domain?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Remove failed');
      setMessage('Domain removed.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-nisk-muted">Loading custom domains…</p>;
  }

  if (!eligible) {
    return (
      <div className="rounded-xl border border-nisk bg-nisk-card p-5 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Custom domain</h2>
        <p className="text-sm text-nisk-muted">
          Map your own hostname (for example <code className="text-[var(--copper-light)]">app.yourcompany.com</code>)
          to your NiskBuild-hosted app. Available on White-Label, Team Enterprise, and Sovereign.
        </p>
        <Link href="/pricing/compare" className="inline-flex text-sm text-[var(--copper-melt)] hover:underline">
          Compare plans →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-nisk bg-nisk-card p-5 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Custom domain</h2>
        <p className="text-sm text-nisk-muted">
          Prove ownership with a TXT record, then point the hostname at Vercel so SSL and traffic work.
          Domains are not activated until DNS verification succeeds.
        </p>
        {!meta?.vercelConfigured && (
          <p className="text-xs text-amber-200/90 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            Automatic Vercel SSL attach is not configured on this deployment yet. After DNS verifies, a
            platform admin may still need to add the domain in the Vercel project for certificates.
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            placeholder="app.yourcompany.com"
            className="flex-1 rounded-lg border border-nisk bg-[var(--iron-dark)] px-3 py-2 text-sm text-[var(--foreground)]"
          />
          <button
            type="button"
            disabled={busy === 'claim' || !hostname.trim()}
            onClick={() => void claim()}
            className="rounded-lg btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {busy === 'claim' ? 'Adding…' : 'Add domain'}
          </button>
        </div>
      </div>

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

      {domains.length === 0 ? (
        <p className="text-sm text-nisk-muted">No custom domains yet.</p>
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => {
            const badge = statusLabel(domain.status);
            const instr = domain.instructions;
            return (
              <article key={domain.id} className="rounded-xl border border-nisk bg-nisk-card p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] font-mono">{domain.hostname}</h3>
                    <p className="text-xs text-nisk-muted mt-1">
                      Vercel attached: {domain.vercel_attached ? 'yes' : 'no'}
                      {domain.verified_at ? ` · Verified ${new Date(domain.verified_at).toLocaleString()}` : ''}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}
                  >
                    {badge.text}
                  </span>
                </div>

                <div className="rounded-lg border border-nisk bg-[var(--iron-dark)] p-3 text-xs space-y-2 font-mono">
                  <p className="text-nisk-muted font-sans text-[11px] uppercase tracking-wide">1. Ownership TXT</p>
                  <p>
                    {instr.txtType} {instr.txtHost}
                  </p>
                  <p className="break-all text-[var(--copper-light)]">{instr.txtValue}</p>
                  <p className="text-nisk-muted font-sans text-[11px] uppercase tracking-wide pt-2">
                    2. Traffic CNAME
                  </p>
                  <p>
                    {instr.cnameType} {instr.cnameHost} → {instr.cnameTarget}
                  </p>
                </div>

                {domain.last_error && (
                  <p className="text-xs text-red-300/90">{domain.last_error}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy === `verify-${domain.id}`}
                    onClick={() => void verify(domain.id)}
                    className="rounded-lg border border-[var(--copper-primary)]/40 bg-[var(--copper-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--copper-melt)] disabled:opacity-50"
                  >
                    {busy === `verify-${domain.id}` ? 'Checking DNS…' : 'Verify DNS'}
                  </button>
                  <button
                    type="button"
                    disabled={busy === `remove-${domain.id}`}
                    onClick={() => void remove(domain.id)}
                    className="rounded-lg border border-nisk px-3 py-1.5 text-xs text-nisk-muted hover:text-white disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
