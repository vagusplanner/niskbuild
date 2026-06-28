"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AdminPlatformShell from '@/app/components/admin/AdminPlatformShell';

type ImportRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  framework: string | null;
  storage_path: string | null;
  workspace_path: string | null;
  source_layer: string;
  listing_id: string | null;
  app_registry_id: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

export default function AdminAppImportClient() {
  const [imports, setImports] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceCents, setPriceCents] = useState('0');
  const [sourceLayer, setSourceLayer] = useState<'subscriber' | 'firstparty'>('subscriber');
  const [publishActive, setPublishActive] = useState(false);
  const [registerFirstparty, setRegisterFirstparty] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const fetchImports = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/apps/import');
    const data = await res.json();
    if (res.ok) setImports(data.imports ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchImports();
  }, [fetchImports]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    const form = new FormData();
    form.append('archive', file);
    form.append('title', title || file.name.replace(/\.zip$/i, ''));
    form.append('description', description);
    form.append('priceCents', priceCents);
    form.append('sourceLayer', sourceLayer);
    form.append('publishActive', String(publishActive));
    form.append('registerFirstparty', String(registerFirstparty || sourceLayer === 'firstparty'));

    try {
      const res = await fetch('/api/admin/apps/import', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setSuccess(
        `Imported “${data.import.title}” → imported-apps/${data.import.storagePath}${
          data.import.listingId ? ` (listing ${data.import.listingId.slice(0, 8)}…)` : ''
        }`
      );
      setTitle('');
      setDescription('');
      await fetchImports();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  const statusClass = (status: string) => {
    if (status === 'completed') return 'bg-emerald-500/15 text-emerald-400';
    if (status === 'failed') return 'bg-red-500/15 text-red-400';
    return 'bg-amber-500/15 text-amber-400';
  };

  return (
    <AdminPlatformShell
      title="📦 Import External App"
      description="ZIP ingestion → interface normalization → dependency injection → marketplace tenant bind"
      stats={[
        { label: 'Total imports', value: imports.length },
        { label: 'Completed', value: imports.filter((i) => i.status === 'completed').length },
        { label: 'Failed', value: imports.filter((i) => i.status === 'failed').length },
      ]}
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/admin/apps" className="px-4 py-2 rounded-lg border border-nisk text-sm hover:border-[var(--copper-primary)]/40">
          ← App registry
        </Link>
        <Link href="/admin/marketplace" className="px-4 py-2 rounded-lg border border-nisk text-sm hover:border-[var(--copper-primary)]/40">
          Marketplace admin
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <section className="bg-nisk-card border border-nisk rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Upload ZIP archive</h2>
          <p className="text-xs text-nisk-muted leading-relaxed">
            Upload a frontend codebase (Vite, Next.js, CRA, or static HTML). NiskBuild extracts it,
            injects Supabase env bindings, writes <code className="text-[var(--copper-melt)]">niskbuild.import.json</code>,
            and creates a marketplace listing for tenant routing.
          </p>

          <label className="block text-xs text-nisk-muted">App title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Imported App"
            className="w-full bg-[var(--surface)] border border-nisk rounded-lg px-3 py-2 text-sm"
          />

          <label className="block text-xs text-nisk-muted">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-[var(--surface)] border border-nisk rounded-lg px-3 py-2 text-sm resize-none"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-nisk-muted mb-1">Price (cents)</label>
              <input
                type="number"
                min={0}
                value={priceCents}
                onChange={(e) => setPriceCents(e.target.value)}
                className="w-full bg-[var(--surface)] border border-nisk rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-nisk-muted mb-1">Source layer</label>
              <select
                value={sourceLayer}
                onChange={(e) => setSourceLayer(e.target.value as 'subscriber' | 'firstparty')}
                className="w-full bg-[var(--surface)] border border-nisk rounded-lg px-3 py-2 text-sm"
              >
                <option value="subscriber">Subscriber (marketplace)</option>
                <option value="firstparty">First-party</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-nisk-muted cursor-pointer">
            <input type="checkbox" checked={publishActive} onChange={(e) => setPublishActive(e.target.checked)} />
            Publish listing immediately (is_active)
          </label>
          <label className="flex items-center gap-2 text-xs text-nisk-muted cursor-pointer">
            <input
              type="checkbox"
              checked={registerFirstparty || sourceLayer === 'firstparty'}
              disabled={sourceLayer === 'firstparty'}
              onChange={(e) => setRegisterFirstparty(e.target.checked)}
            />
            Register in firstparty.app_registry
          </label>

          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) void uploadFile(file);
            }}
            onClick={() => inputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-[var(--copper-primary)] bg-[var(--copper-primary)]/10'
                : 'border-[var(--border)] hover:border-[var(--copper-primary)]/40'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
                e.target.value = '';
              }}
            />
            <p className="text-sm text-[var(--foreground)]">
              {uploading ? 'Processing import…' : 'Drop ZIP here or click to browse'}
            </p>
            <p className="text-[10px] text-nisk-muted mt-1">Max 50MB · node_modules excluded on re-import</p>
          </div>

          {error && (
            <p className="text-xs text-[var(--error)] bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              {success}
            </p>
          )}
        </section>

        <section className="bg-nisk-card border border-nisk rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Ingestion pipeline</h2>
          <ol className="text-xs text-nisk-muted space-y-2 leading-relaxed list-decimal list-inside">
            <li>Extract ZIP → locate app root (package.json or index.html)</li>
            <li>Interface normalization — upload to <code>imported-apps/&lt;slug&gt;/source.zip</code></li>
            <li>Dependency injection — <code>.env.example</code> + <code>niskbuild-env.js</code></li>
            <li>Marketplace listing — <code>marketplace.listings</code> with import manifest</li>
            <li>Optional — <code>firstparty.app_registry</code> draft row</li>
          </ol>
          <p className="text-[10px] text-nisk-muted mt-4">
            Imported workspaces bind to NiskBuild social publisher, preview switcher, and App Store
            checklist via the generated manifest. Dynamic builder studio registration is the next
            integration step.
          </p>
        </section>
      </div>

      <div className="bg-nisk-card border border-nisk rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-nisk flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent imports</h2>
          <button type="button" onClick={() => void fetchImports()} className="text-xs text-nisk-muted hover:text-[var(--foreground)]">
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-nisk-muted text-center">Loading…</p>
        ) : imports.length === 0 ? (
          <p className="p-6 text-sm text-nisk-muted text-center">No imports yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-elevated)] border-b border-nisk">
                <tr>
                  <th className="text-left p-3 font-medium text-nisk-muted">Title</th>
                  <th className="text-left p-3 font-medium text-nisk-muted">Status</th>
                  <th className="text-left p-3 font-medium text-nisk-muted">Framework</th>
                  <th className="text-left p-3 font-medium text-nisk-muted">Storage</th>
                  <th className="text-left p-3 font-medium text-nisk-muted">Listing</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((row) => (
                  <tr key={row.id} className="border-b border-nisk hover:bg-[var(--surface)]/40">
                    <td className="p-3">
                      <p className="font-medium text-[var(--foreground)]">{row.title}</p>
                      <p className="text-[10px] text-nisk-muted">{row.slug}</p>
                      {row.error_message && (
                        <p className="text-[10px] text-[var(--error)] mt-1">{row.error_message}</p>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusClass(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 text-nisk-muted">{row.framework || '—'}</td>
                    <td className="p-3 font-mono text-[10px] text-nisk-muted">
                      {row.storage_path
                        ? `imported-apps/${row.storage_path}`
                        : row.workspace_path ?? '—'}
                    </td>
                    <td className="p-3">
                      {row.listing_id ? (
                        <Link href="/admin/marketplace" className="text-[var(--copper-melt)] hover:underline text-xs">
                          View listings
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPlatformShell>
  );
}
