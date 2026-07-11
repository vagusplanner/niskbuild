'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type BrandingOrg = {
  id: string;
  name: string;
  brandAppName: string;
  brandLogoUrl: string;
  hideNiskbuildAttribution: boolean;
};

export default function WhiteLabelBrandingPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [org, setOrg] = useState<BrandingOrg | null>(null);
  const [appName, setAppName] = useState('');
  const [hideAttribution, setHideAttribution] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/settings/branding', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to load branding');
      setAllowed(false);
      setOrg(null);
    } else {
      setAllowed(!!data.allowed);
      setOrg(data.org ?? null);
      setAppName(data.org?.brandAppName || '');
      setHideAttribution(
        data.org?.hideNiskbuildAttribution !== undefined
          ? !!data.org.hideNiskbuildAttribution
          : true
      );
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
      const form = new FormData();
      form.set('brandAppName', appName);
      form.set('hideNiskbuildAttribution', hideAttribution ? 'true' : 'false');
      if (logoFile) form.set('logo', logoFile);

      const res = await fetch('/api/settings/branding', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setOrg(data.org);
      setAppName(data.org.brandAppName || '');
      setHideAttribution(!!data.org.hideNiskbuildAttribution);
      setLogoFile(null);
      setMessage('Branding saved. It applies on your custom domain only.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-nisk-muted">Loading branding…</p>;
  }

  if (!allowed) {
    return (
      <div className="rounded-xl border border-nisk bg-nisk-card p-5 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          White-label branding
        </h2>
        <p className="text-sm text-nisk-muted">
          Custom app name and logo on your published custom domain are included on White-Label,
          Team Enterprise, and Sovereign. The NiskBuild builder on niskbuild.com keeps its own
          branding.
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
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          White-label branding
        </h2>
        <p className="text-xs text-nisk-muted mt-1">
          Applies on your custom domain only — the NiskBuild builder itself keeps its own branding.
        </p>
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

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-nisk-muted">
          App name
        </label>
        <input
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          placeholder={org?.name || 'Your product name'}
          maxLength={80}
          className="w-full rounded-lg border border-nisk bg-[var(--iron-dark)] px-3 py-2 text-sm text-[var(--foreground)]"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-nisk-muted">
          Logo
        </label>
        {org?.brandLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.brandLogoUrl}
            alt=""
            className="h-12 w-12 rounded object-contain border border-nisk bg-[var(--iron-dark)]"
          />
        ) : null}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-nisk-muted"
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-[var(--foreground)] cursor-pointer">
        <input
          type="checkbox"
          checked={hideAttribution}
          onChange={(e) => setHideAttribution(e.target.checked)}
          className="mt-1 rounded border-nisk"
        />
        <span>
          Remove “Powered by NiskBuild” on your custom domain
          <span className="block text-xs text-nisk-muted mt-0.5">
            Included with White-Label+. If your plan drops below White-Label, attribution returns
            automatically.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-lg btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save branding'}
        </button>
        <Link
          href="/dashboard/settings?tab=domains"
          className="text-sm text-[var(--copper-melt)] hover:underline self-center"
        >
          Manage custom domains →
        </Link>
      </div>
    </div>
  );
}
