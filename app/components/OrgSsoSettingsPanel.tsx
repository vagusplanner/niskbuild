'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type SsoConfig = {
  orgId: string;
  orgName: string;
  ssoProviderId: string | null;
  ssoDomain: string | null;
  ssoEnabled: boolean;
};

export default function OrgSsoSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [config, setConfig] = useState<SsoConfig | null>(null);
  const [domain, setDomain] = useState('');
  const [metadataUrl, setMetadataUrl] = useState('');
  const [metadataXml, setMetadataXml] = useState('');
  const [acsUrl, setAcsUrl] = useState('');
  const [entityId, setEntityId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/settings/sso', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to load SSO');
      setAllowed(false);
    } else {
      setAllowed(!!data.allowed);
      setConfig(data.config ?? null);
      setDomain(data.config?.ssoDomain || '');
      setAcsUrl(data.projectAcsUrl || '');
      setEntityId(data.projectEntityId || '');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/sso', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          domain,
          metadataUrl,
          metadataXml,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setConfig(data.config);
      setDomain(data.config?.ssoDomain || '');
      setMessage(data.message || 'SSO saved.');
      setMetadataXml('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const disable = async () => {
    if (!confirm('Disable SSO for this organization? Teammates will need Google or email/password.')) {
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/sso', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Disable failed');
      setConfig(data.config);
      setDomain('');
      setMetadataUrl('');
      setMessage(data.message || 'SSO disabled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disable failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-nisk-muted">Loading SSO…</p>;
  }

  if (!allowed) {
    return (
      <div className="rounded-xl border border-nisk bg-nisk-card p-5 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">SSO (SAML)</h2>
        <p className="text-sm text-nisk-muted">
          Single sign-on with your company IdP (Okta, Microsoft Entra, Google Workspace, etc.) is
          included on Team Enterprise and Sovereign. Only the organization owner can configure it.
        </p>
        <Link
          href="/pricing/compare"
          className="inline-flex text-sm text-[var(--copper-melt)] hover:underline"
        >
          Compare plans →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-nisk bg-nisk-card p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">SSO (SAML)</h2>
        <p className="text-xs text-nisk-muted mt-1">
          Invited teammates sign in with your company IdP. SSO does not auto-join users — they still
          need a team invite.
        </p>
      </div>

      {config?.ssoEnabled && (
        <p className="text-sm rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-200">
          SSO enabled for <strong>@{config.ssoDomain}</strong>
          {config.ssoProviderId ? (
            <span className="block text-xs mt-1 opacity-80 font-mono">
              Provider {config.ssoProviderId}
            </span>
          ) : null}
        </p>
      )}

      {message && (
        <p className="text-sm rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-200">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200 whitespace-pre-wrap">
          {error}
        </p>
      )}

      {(acsUrl || entityId) && (
        <div className="rounded-lg border border-nisk bg-[var(--iron-dark)] px-3 py-2 space-y-1 text-xs text-nisk-muted">
          <p className="font-semibold text-[var(--foreground)]">Give these to your IdP admin</p>
          {acsUrl ? (
            <p>
              ACS URL:{' '}
              <code className="text-[var(--copper-light)] break-all">{acsUrl}</code>
            </p>
          ) : null}
          {entityId ? (
            <p>
              Entity ID / Metadata:{' '}
              <code className="text-[var(--copper-light)] break-all">{entityId}</code>
            </p>
          ) : null}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-nisk-muted">
          Company email domain
        </label>
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="acme.com"
          className="w-full rounded-lg border border-nisk bg-[var(--iron-dark)] px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-nisk-muted">
          IdP metadata URL
        </label>
        <input
          value={metadataUrl}
          onChange={(e) => setMetadataUrl(e.target.value)}
          placeholder="https://idp.example.com/app/…/sso/saml/metadata"
          className="w-full rounded-lg border border-nisk bg-[var(--iron-dark)] px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-nisk-muted">
          Or paste metadata XML
        </label>
        <textarea
          value={metadataXml}
          onChange={(e) => setMetadataXml(e.target.value)}
          rows={5}
          placeholder="<EntityDescriptor …>"
          className="w-full rounded-lg border border-nisk bg-[var(--iron-dark)] px-3 py-2 text-sm font-mono"
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !domain.trim()}
          className="rounded-lg btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving…' : config?.ssoEnabled ? 'Update SSO' : 'Enable SSO'}
        </button>
        {config?.ssoEnabled ? (
          <button
            type="button"
            onClick={() => void disable()}
            disabled={saving}
            className="rounded-lg btn-secondary px-4 py-2 text-sm disabled:opacity-50"
          >
            Disable SSO
          </button>
        ) : null}
      </div>
    </div>
  );
}
