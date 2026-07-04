'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminPlatformShell from '@/app/components/admin/AdminPlatformShell';

type ArtifactStatus = {
  currentLockfileHash: string | null;
  hashError?: string | null;
  latest: {
    lockfileHash: string;
    storagePath: string;
    sizeBytes: number;
    createdAt: string;
    matchesCurrentLockfile: boolean;
  } | null;
};

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function AdminVpDeployClient() {
  const [status, setStatus] = useState<ArtifactStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/vp-deploy-artifact', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load status');
        setStatus(null);
      } else {
        setStatus(data);
      }
    } catch {
      setError('Failed to load status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const buildArtifact = async () => {
    if (building) return;
    const ok = confirm(
      'Build and upload a fresh VP node_modules artifact?\n\nThis runs npm ci on the server and may take several minutes.'
    );
    if (!ok) return;

    setBuilding(true);
    setMessage(null);
    setError(null);
    setLogs([]);

    try {
      const res = await fetch('/api/admin/vp-deploy-artifact', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Build failed');
      } else {
        setMessage(data.message || 'Artifact uploaded');
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        await loadStatus();
      }
    } catch {
      setError('Build request failed');
    } finally {
      setBuilding(false);
    }
  };

  const latest = status?.latest;
  const stale = latest ? !latest.matchesCurrentLockfile : true;

  return (
    <AdminPlatformShell
      title="VP Deploy Artifacts"
      description="Prebuilt node_modules archives for Vagus Planner web Deploy (avoids npm ci on every click)."
      stats={[
        {
          label: 'Current lockfile hash',
          value: status?.currentLockfileHash?.slice(0, 8) ?? (status?.hashError ? 'Error' : '—'),
          hint: status?.hashError || status?.currentLockfileHash || undefined,
        },
        {
          label: 'Artifact status',
          value: loading ? '…' : latest ? (stale ? 'Stale' : 'Current') : 'Missing',
        },
        {
          label: 'Artifact size',
          value: latest ? formatBytes(latest.sizeBytes) : '—',
        },
        {
          label: 'Last built',
          value: latest ? new Date(latest.createdAt).toLocaleString() : '—',
        },
      ]}
    >
      <div className="bg-nisk-card border border-nisk rounded-xl p-6 space-y-4">
        <p className="text-sm text-nisk-muted leading-relaxed">
          Builds <code className="text-xs">apps/vagus-planner</code> dependencies with{' '}
          <code className="text-xs">npm ci --omit=dev</code>, archives{' '}
          <code className="text-xs">node_modules</code>, and uploads to the private{' '}
          <code className="text-xs">vp-deploy-artifacts</code> bucket. Prefer running{' '}
          <code className="text-xs">node scripts/build-vp-deploy-artifact.js</code> locally when
          possible — the server path shares the same serverless limits as Deploy.
        </p>

        {latest && (
          <dl className="grid gap-2 text-sm">
            <div className="flex gap-2">
              <dt className="text-nisk-muted w-36 shrink-0">Storage path</dt>
              <dd className="font-mono text-xs break-all">{latest.storagePath}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-nisk-muted w-36 shrink-0">Lockfile hash</dt>
              <dd className="font-mono text-xs">{latest.lockfileHash}</dd>
            </div>
          </dl>
        )}

        {message && (
          <p className="text-sm text-emerald-500 font-medium">{message}</p>
        )}
        {error && <p className="text-sm text-red-400 font-medium">{error}</p>}

        {logs.length > 0 && (
          <pre className="text-xs bg-black/30 rounded-lg p-3 overflow-x-auto max-h-48 text-nisk-muted">
            {logs.join('\n')}
          </pre>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void buildArtifact()}
            disabled={building || loading}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-50"
          >
            {building ? 'Building artifact…' : 'Build & upload artifact'}
          </button>
          <button
            type="button"
            onClick={() => void loadStatus()}
            disabled={loading || building}
            className="px-4 py-2 rounded-lg border border-nisk text-sm font-medium disabled:opacity-50"
          >
            Refresh status
          </button>
        </div>
      </div>
    </AdminPlatformShell>
  );
}
