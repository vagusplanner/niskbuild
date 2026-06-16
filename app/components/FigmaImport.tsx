"use client";

import { useState } from 'react';

export type FigmaImportResult = {
  fileKey: string;
  fileName: string | null;
  components: { id: string; name: string; type: string }[];
  code: string;
};

interface FigmaImportProps {
  onImport: (result: FigmaImportResult) => void;
}

export default function FigmaImport({ onImport }: FigmaImportProps) {
  const [open, setOpen] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState('');
  const [figmaToken, setFigmaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<FigmaImportResult | null>(null);

  const resetForm = () => {
    setFigmaUrl('');
    setFigmaToken('');
    setError(null);
    setPreview(null);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleImport = async () => {
    if (!figmaUrl.trim() || !figmaToken.trim()) {
      setError('Please enter both Figma URL and personal access token.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/figma/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ figmaUrl: figmaUrl.trim(), figmaToken: figmaToken.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Import failed');
        return;
      }

      const result: FigmaImportResult = {
        fileKey: data.fileKey,
        fileName: data.fileName ?? null,
        components: data.components ?? [],
        code: data.code,
      };

      setPreview(result);
      onImport(result);
      handleClose();
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="shrink-0 px-0 pb-0 mt-3">
        <p className="text-[10px] text-nisk-muted mb-2">
          Turn Figma components into starter React code in the builder.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 btn-secondary hover:border-[var(--primary)]"
        >
          <span>🎨</span>
          Import from Figma
        </button>
        <p className="text-[10px] text-nisk-muted text-center mt-1.5">
          Uses your Figma personal access token — never stored on our servers.
        </p>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-nisk bg-nisk-card shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-nisk flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Import from Figma</h2>
              <button
                type="button"
                onClick={handleClose}
                className="text-nisk-muted hover:text-[var(--foreground)] text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-nisk-muted">
                Paste a Figma file link and your personal access token. We fetch components and
                generate starter React code you can refine in the builder.
              </p>

              <div>
                <label className="text-xs text-nisk-muted block mb-1">Figma file URL</label>
                <input
                  type="url"
                  placeholder="https://www.figma.com/design/..."
                  value={figmaUrl}
                  onChange={(e) => setFigmaUrl(e.target.value)}
                  className="w-full p-2.5 glass-input rounded-lg text-sm"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="text-xs text-nisk-muted block mb-1">Personal access token</label>
                <input
                  type="password"
                  placeholder="figd_..."
                  value={figmaToken}
                  onChange={(e) => setFigmaToken(e.target.value)}
                  className="w-full p-2.5 glass-input rounded-lg text-sm"
                  autoComplete="off"
                />
                <p className="text-[10px] text-nisk-muted mt-1">
                  Create one in{' '}
                  <a
                    href="https://www.figma.com/developers/api#access-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--primary)] hover:underline"
                  >
                    Figma account settings
                  </a>
                  . Token is sent once to import and is not saved.
                </p>
              </div>

              {preview && (
                <div className="rounded-lg p-3 border border-nisk bg-[var(--surface)]">
                  <p className="text-xs text-nisk-muted">
                    Last import: {preview.components.length} component
                    {preview.components.length === 1 ? '' : 's'}
                    {preview.fileName ? ` from “${preview.fileName}”` : ''}
                  </p>
                </div>
              )}

              {error && (
                <p className="text-xs text-[var(--tagline)] bg-[var(--primary)]/8 border border-[var(--primary)]/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleClose} className="flex-1 btn-secondary py-2.5 rounded-lg text-sm">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={loading || !figmaUrl.trim() || !figmaToken.trim()}
                  className="flex-1 btn-primary py-2.5 rounded-lg text-sm disabled:opacity-50"
                >
                  {loading ? 'Importing…' : 'Import from Figma'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
