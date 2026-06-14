"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cleanGeneratedCode } from '@/lib/cleanGeneratedCode';
import { canCompareVersions, formatTimeAgo } from '@/lib/version-limits';

export type VersionListItem = {
  id: string;
  version_number: number;
  prompt_used: string;
  credits_used: number;
  created_at: string;
};

type VersionHistoryPanelProps = {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  subscriptionTier: string;
  onRestore: (payload: {
    generated_code: string;
    prompt: string;
    blueprint_json: unknown;
    restored_version: number;
  }) => void;
};

function truncatePrompt(text: string, max = 80): string {
  const t = text.trim();
  if (t.length <= max) return t || '(no prompt recorded)';
  return `${t.slice(0, max)}…`;
}

function buildLineDiff(a: string, b: string): { type: 'same' | 'add' | 'remove'; line: string }[] {
  const linesA = a.split('\n');
  const linesB = b.split('\n');
  const max = Math.max(linesA.length, linesB.length);
  const out: { type: 'same' | 'add' | 'remove'; line: string }[] = [];
  for (let i = 0; i < max; i++) {
    const la = linesA[i];
    const lb = linesB[i];
    if (la === lb) {
      if (la !== undefined) out.push({ type: 'same', line: la });
    } else {
      if (la !== undefined) out.push({ type: 'remove', line: la });
      if (lb !== undefined) out.push({ type: 'add', line: lb });
    }
  }
  return out.slice(0, 400);
}

export default function VersionHistoryPanel({
  open,
  onClose,
  projectId,
  subscriptionTier,
  onRestore,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<VersionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<{
    version_number: number;
    generated_code: string;
    prompt_used: string;
  } | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [compareData, setCompareData] = useState<{ a: string; b: string; labels: [string, string] } | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const canCompare = canCompareVersions(subscriptionTier);

  const loadVersions = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setVersions(data.versions || []);
    } catch {
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open && projectId) void loadVersions();
  }, [open, projectId, loadVersions]);

  const latestVersion = versions[0]?.version_number ?? 0;

  const openPreview = async (version: VersionListItem) => {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}/versions/${version.id}`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok && data.version) {
      setPreviewVersion({
        version_number: data.version.version_number,
        generated_code: data.version.generated_code,
        prompt_used: data.version.prompt_used || '',
      });
    }
  };

  const handleRestore = async (version: VersionListItem) => {
    if (!projectId) return;
    const ok = confirm(
      `Restore v${version.version_number}? This will replace your current build. Current version will be saved as v${latestVersion + 1} before restoring.`
    );
    if (!ok) return;

    setRestoringId(version.id);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ version_id: version.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Restore failed');
        return;
      }
      onRestore({
        generated_code: data.generated_code,
        prompt: data.prompt || '',
        blueprint_json: data.blueprint_json,
        restored_version: data.restored_version,
      });
      await loadVersions();
      onClose();
    } finally {
      setRestoringId(null);
    }
  };

  const toggleCompareSelect = (id: string) => {
    if (!compareA) {
      setCompareA(id);
      return;
    }
    if (compareA === id) {
      setCompareA(null);
      setCompareB(null);
      return;
    }
    if (!compareB) {
      setCompareB(id);
      return;
    }
    setCompareA(id);
    setCompareB(null);
  };

  const runCompare = async () => {
    if (!projectId || !compareA || !compareB) return;
    const [resA, resB] = await Promise.all([
      fetch(`/api/projects/${projectId}/versions/${compareA}`, { credentials: 'include' }),
      fetch(`/api/projects/${projectId}/versions/${compareB}`, { credentials: 'include' }),
    ]);
    const [dataA, dataB] = await Promise.all([resA.json(), resB.json()]);
    if (!resA.ok || !resB.ok) return;
    const va = dataA.version;
    const vb = dataB.version;
    setCompareData({
      a: va.generated_code,
      b: vb.generated_code,
      labels: [`v${va.version_number}`, `v${vb.version_number}`],
    });
  };

  const previewHtml = useMemo(() => {
    if (!previewVersion) return '';
    return cleanGeneratedCode(previewVersion.generated_code);
  }, [previewVersion]);

  const diffLines = useMemo(() => {
    if (!compareData) return [];
    return buildLineDiff(compareData.a, compareData.b);
  }, [compareData]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[85] bg-black/40 md:hidden" onClick={onClose} aria-hidden />
      <aside
        className="fixed top-14 right-0 bottom-0 z-[90] w-full max-w-md border-l border-nisk bg-nisk-card flex flex-col shadow-2xl transition-transform duration-200"
        role="dialog"
        aria-label="Version history"
      >
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-nisk">
          <div>
            <h2 className="text-sm font-semibold text-white">Version History</h2>
            <p className="text-[10px] text-nisk-muted mt-0.5">
              {projectId ? `${versions.length} saved version${versions.length !== 1 ? 's' : ''}` : 'Save project first'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-nisk-muted hover:text-white text-xl leading-none px-2"
            aria-label="Close history"
          >
            ×
          </button>
        </div>

        {!projectId ? (
          <p className="p-4 text-sm text-nisk-muted">
            Save this project to start tracking versions automatically on each AI generation.
          </p>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : versions.length === 0 ? (
          <p className="p-4 text-sm text-nisk-muted">
            No versions yet. Each successful AI generation creates a new version automatically.
          </p>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {canCompare && (
              <div className="mb-3 p-3 rounded-xl border border-nisk bg-nisk-surface">
                <button
                  type="button"
                  onClick={() => {
                    setCompareMode((v) => !v);
                    setCompareA(null);
                    setCompareB(null);
                    setCompareData(null);
                  }}
                  className="text-xs text-[var(--accent-cyan)] hover:underline"
                >
                  {compareMode ? 'Cancel compare' : 'Compare Versions'}
                </button>
                {compareMode && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] text-nisk-muted">
                      Select two versions ({compareA ? 1 : 0}/2)
                    </span>
                    <button
                      type="button"
                      disabled={!compareA || !compareB}
                      onClick={() => void runCompare()}
                      className="btn-secondary px-2 py-1 text-[10px] rounded disabled:opacity-40"
                    >
                      Show diff
                    </button>
                  </div>
                )}
              </div>
            )}

            {versions.map((v) => (
              <div
                key={v.id}
                className={`p-3 rounded-xl border bg-nisk-surface ${
                  compareMode && (compareA === v.id || compareB === v.id)
                    ? 'border-[var(--accent-cyan)]'
                    : 'border-nisk'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">v{v.version_number}</p>
                    <p className="text-xs text-nisk-muted mt-1 line-clamp-2">
                      {truncatePrompt(v.prompt_used)}
                    </p>
                    <p className="text-[10px] text-nisk-muted mt-1.5">
                      {formatTimeAgo(v.created_at)} · {Number(v.credits_used)} cr
                    </p>
                  </div>
                  {compareMode ? (
                    <button
                      type="button"
                      onClick={() => toggleCompareSelect(v.id)}
                      className="btn-secondary px-2 py-1 text-[10px] rounded shrink-0"
                    >
                      {compareA === v.id || compareB === v.id ? 'Selected' : 'Select'}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => void openPreview(v)}
                        className="btn-secondary px-2 py-1 text-[10px] rounded"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRestore(v)}
                        disabled={restoringId === v.id}
                        className="btn-primary px-2 py-1 text-[10px] rounded disabled:opacity-40"
                      >
                        {restoringId === v.id ? '…' : 'Restore'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>

      {previewVersion && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewVersion(null)}
        >
          <div
            className="w-full max-w-6xl max-h-[90vh] rounded-2xl border border-nisk bg-nisk-card overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-nisk flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Preview v{previewVersion.version_number}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewVersion(null)}
                className="text-nisk-muted hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="flex-1 grid md:grid-cols-2 min-h-0">
              <pre className="p-4 overflow-auto text-xs font-mono text-gray-300 bg-[#0a0f1a] border-r border-nisk max-h-[70vh]">
                {previewVersion.generated_code.slice(0, 12000)}
                {previewVersion.generated_code.length > 12000 && '\n… truncated'}
              </pre>
              <iframe
                title={`Preview v${previewVersion.version_number}`}
                srcDoc={previewHtml}
                className="w-full min-h-[300px] max-h-[70vh] bg-white"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}

      {compareData && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setCompareData(null)}
        >
          <div
            className="w-full max-w-5xl max-h-[90vh] rounded-2xl border border-nisk bg-nisk-card overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-nisk flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Compare {compareData.labels[0]} vs {compareData.labels[1]}
              </h3>
              <button type="button" onClick={() => setCompareData(null)} className="text-nisk-muted hover:text-white">
                ×
              </button>
            </div>
            <pre className="flex-1 p-4 overflow-auto text-xs font-mono max-h-[75vh]">
              {diffLines.map((row, i) => (
                <div
                  key={i}
                  className={
                    row.type === 'add'
                      ? 'text-[var(--success)] bg-[var(--success)]/10'
                      : row.type === 'remove'
                        ? 'text-red-400 bg-red-500/10'
                        : 'text-gray-400'
                  }
                >
                  {row.type === 'add' ? '+ ' : row.type === 'remove' ? '- ' : '  '}
                  {row.line}
                </div>
              ))}
            </pre>
          </div>
        </div>
      )}
    </>
  );
}
