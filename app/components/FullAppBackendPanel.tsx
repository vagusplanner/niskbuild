'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  clearFullAppBackendLocal,
  isValidAnonKey,
  isValidSupabaseUrl,
  loadFullAppBackendLocal,
  maskAnonKey,
  saveFullAppBackendLocal,
  type FullAppBackendConfig,
} from '@/lib/full-app-backend';

type FullAppBackendPanelProps = {
  projectId: string | null;
  onBackendChange: (config: FullAppBackendConfig | null) => void;
};

/**
 * Two-track backend connection UI:
 * 1. Connect your own backend (BYO) — functional
 * 2. NiskBuild Managed — Coming soon placeholder
 */
export default function FullAppBackendPanel({
  projectId,
  onBackendChange,
}: FullAppBackendPanelProps) {
  const [track, setTrack] = useState<'byo' | 'managed'>('byo');
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [connectedUrl, setConnectedUrl] = useState<string | null>(null);
  const [connectedMasked, setConnectedMasked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyConfig = useCallback(
    (config: FullAppBackendConfig | null) => {
      if (config?.mode === 'byo' && config.supabaseUrl && config.supabaseAnonKey) {
        setConnectedUrl(config.supabaseUrl);
        setConnectedMasked(maskAnonKey(config.supabaseAnonKey));
        setUrl(config.supabaseUrl);
        setAnonKey('');
      } else {
        setConnectedUrl(null);
        setConnectedMasked(null);
      }
      onBackendChange(config);
    },
    [onBackendChange]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadFullAppBackendLocal(projectId);
      if (local?.mode === 'byo' && local.supabaseUrl && local.supabaseAnonKey) {
        if (!cancelled) applyConfig(local);
      }

      if (!projectId) return;

      try {
        const res = await fetch(
          `/api/full-app/backend?projectId=${encodeURIComponent(projectId)}&forPreview=1`
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          connected?: boolean;
          supabaseUrl?: string | null;
          supabaseAnonKey?: string;
        };
        if (data.connected && data.supabaseUrl && data.supabaseAnonKey) {
          const cfg: FullAppBackendConfig = {
            mode: 'byo',
            supabaseUrl: data.supabaseUrl,
            supabaseAnonKey: data.supabaseAnonKey,
          };
          saveFullAppBackendLocal(projectId, cfg);
          if (!cancelled) applyConfig(cfg);
        }
      } catch {
        /* local draft is enough while offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, applyConfig]);

  const handleConnect = async () => {
    setError(null);
    setMessage(null);
    if (!isValidSupabaseUrl(url)) {
      setError('Enter a valid https://….supabase.co project URL');
      return;
    }
    if (!isValidAnonKey(anonKey) && !connectedMasked) {
      setError('Paste your project anon (public) key from Supabase → Settings → API');
      return;
    }
    const keyToSave = anonKey.trim() || undefined;
    if (!keyToSave && !connectedMasked) {
      setError('Anon key is required');
      return;
    }

    // If reconnecting with only URL change and blank key, keep existing local key
    let resolvedKey = keyToSave;
    if (!resolvedKey) {
      const existing = loadFullAppBackendLocal(projectId);
      resolvedKey = existing?.supabaseAnonKey;
    }
    if (!resolvedKey) {
      setError('Anon key is required');
      return;
    }

    const cfg: FullAppBackendConfig = {
      mode: 'byo',
      supabaseUrl: url.trim(),
      supabaseAnonKey: resolvedKey,
    };

    setBusy(true);
    try {
      saveFullAppBackendLocal(projectId, cfg);
      applyConfig(cfg);

      if (projectId) {
        const res = await fetch('/api/full-app/backend', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            mode: 'byo',
            supabaseUrl: cfg.supabaseUrl,
            supabaseAnonKey: cfg.supabaseAnonKey,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(
            typeof data.error === 'string'
              ? data.error
              : 'Saved locally; cloud sync failed — save the project and retry'
          );
        } else {
          setMessage('Backend connected. Preview will use these credentials.');
        }
      } else {
        setMessage(
          'Backend saved for this draft. Save the project to sync credentials to your account.'
        );
      }
      setAnonKey('');
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      clearFullAppBackendLocal(projectId);
      applyConfig(null);
      setUrl('');
      setAnonKey('');
      if (projectId) {
        await fetch(
          `/api/full-app/backend?projectId=${encodeURIComponent(projectId)}`,
          { method: 'DELETE' }
        );
      }
      setMessage('Backend disconnected.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Backend</h3>
        <p className="text-xs text-nisk-muted mt-1 leading-relaxed">
          Full App auth and database use your own Supabase project today. NiskBuild Managed
          (auto-provisioned) is coming soon.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-nisk p-1 bg-[var(--surface)]">
        <button
          type="button"
          onClick={() => setTrack('byo')}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
            track === 'byo'
              ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
              : 'text-nisk-muted hover:text-[var(--foreground)]'
          }`}
        >
          Connect your own
        </button>
        <button
          type="button"
          onClick={() => setTrack('managed')}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
            track === 'managed'
              ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
              : 'text-nisk-muted hover:text-[var(--foreground)]'
          }`}
        >
          NiskBuild Managed
          <span className="ml-1 text-[10px] opacity-80">· soon</span>
        </button>
      </div>

      {track === 'managed' ? (
        <div className="rounded-xl border border-dashed border-nisk bg-[var(--surface)] p-4">
          <p className="text-sm font-medium text-[var(--foreground)] mb-1">
            NiskBuild Managed — Coming soon
          </p>
          <p className="text-xs text-nisk-muted leading-relaxed">
            We&apos;ll provision a Supabase backend for your Full App automatically (pending
            Supabase Platforms partnership). Until then, use <strong>Connect your own</strong> —
            paste your project URL and anon key. Your exported app always runs on credentials you
            control.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {connectedUrl ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-[var(--foreground)]">
              Connected to <code className="text-[10px]">{connectedUrl}</code>
              {connectedMasked ? (
                <span className="text-nisk-muted"> · key {connectedMasked}</span>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-nisk-muted">
              Not connected — generated apps will show a connect prompt until you add credentials.
            </div>
          )}

          <label className="block space-y-1">
            <span className="text-[10px] uppercase tracking-wide text-nisk-muted">
              Supabase project URL
            </span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xxxx.supabase.co"
              className="w-full rounded-lg border border-nisk bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)]"
              autoComplete="off"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] uppercase tracking-wide text-nisk-muted">
              Anon / public key
            </span>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder={
                connectedMasked
                  ? 'Leave blank to keep existing key'
                  : 'eyJ… or sb_publishable_…'
              }
              className="w-full rounded-lg border border-nisk bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)]"
              autoComplete="off"
            />
          </label>

          <p className="text-[10px] text-nisk-muted leading-relaxed">
            From Supabase Dashboard → Project Settings → API. Use the <em>anon</em> / publishable
            key only — never the service role key. After connecting, run{' '}
            <code className="text-[10px]">supabase/schema.sql</code> in the SQL Editor.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleConnect()}
              className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Saving…' : connectedUrl ? 'Update connection' : 'Connect backend'}
            </button>
            {connectedUrl ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDisconnect()}
                className="rounded-lg border border-nisk px-3 py-1.5 text-xs text-nisk-muted hover:text-[var(--foreground)] disabled:opacity-50"
              >
                Disconnect
              </button>
            ) : null}
          </div>
        </div>
      )}

      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      {message ? <p className="text-xs text-emerald-400">{message}</p> : null}
    </div>
  );
}
