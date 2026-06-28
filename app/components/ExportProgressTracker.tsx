"use client";

import { useMemo, useState } from 'react';
import type { ProjectExportJobStatus } from '@/lib/project-export/types';

export type ExportStepState = 'pending' | 'running' | 'done' | 'failed';

const DEFAULT_STEPS = [
  { key: 'build', label: 'Build web bundle' },
  { key: 'sync', label: 'Sync to Capacitor' },
  { key: 'ready', label: 'Ready for download' },
] as const;

function stepStateForStatus(
  status: ProjectExportJobStatus | null,
  stepIndex: number,
  log: string
): ExportStepState {
  if (!status || status === 'pending') return stepIndex === 0 ? 'running' : 'pending';
  if (status === 'ready' || status === 'ready_zip_only') return 'done';
  if (status === 'building') {
    return stepIndex === 0 ? 'running' : 'pending';
  }
  if (status === 'syncing') {
    if (stepIndex === 0) return 'done';
    if (stepIndex === 1) return 'running';
    return 'pending';
  }
  if (status === 'failed') {
    const reachedSync =
      log.includes('Syncing Capacitor') || log.includes('cap sync') || log.includes('starter ZIP');
    if (stepIndex === 0) return reachedSync ? 'done' : 'failed';
    if (stepIndex === 1) return reachedSync ? 'failed' : 'pending';
    return 'pending';
  }
  return 'pending';
}

function StepIcon({ state }: { state: ExportStepState }) {
  if (state === 'running') {
    return (
      <span className="w-7 h-7 flex items-center justify-center">
        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--copper-primary)]" />
      </span>
    );
  }
  if (state === 'done') {
    return (
      <span className="w-7 h-7 flex items-center justify-center text-[var(--copper-melt)] border-2 border-[var(--copper-primary)] text-xs font-bold rounded-full">
        ✓
      </span>
    );
  }
  if (state === 'failed') {
    return (
      <span className="w-7 h-7 flex items-center justify-center text-[var(--error)] border-2 border-[var(--error)] text-xs font-bold rounded-full">
        ✕
      </span>
    );
  }
  return (
    <span className="w-7 h-7 flex items-center justify-center border-2 border-[var(--border)] text-xs text-nisk-muted rounded-full">
      ○
    </span>
  );
}

type ExportProgressTrackerProps = {
  status: ProjectExportJobStatus | null;
  logTail?: string;
  downloadUrl?: string | null;
  downloadLabel?: string;
  iosWorkspace?: string | null;
};

export default function ExportProgressTracker({
  status,
  logTail = '',
  downloadUrl,
  downloadLabel = 'Download export package',
  iosWorkspace,
}: ExportProgressTrackerProps) {
  const [copied, setCopied] = useState(false);
  const stepStates = useMemo(
    () => DEFAULT_STEPS.map((_, i) => stepStateForStatus(status, i, logTail)),
    [status, logTail]
  );

  const copyCapCommand = async () => {
    try {
      await navigator.clipboard.writeText('npx cap sync ios');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const isComplete = status === 'ready' || status === 'ready_zip_only';

  return (
    <div className="space-y-4">
      <div className="p-5 border border-[var(--border)] bg-[var(--card-bg)] rounded-xl">
        <p className="text-xs uppercase tracking-wider text-nisk-muted font-semibold mb-4">
          Export progress
        </p>
        <ol className="space-y-4">
          {DEFAULT_STEPS.map((step, i) => (
            <li key={step.key} className="flex items-start gap-3">
              <StepIcon state={stepStates[i]} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {step.key === 'sync' && status === 'ready_zip_only'
                    ? 'Finish on Mac (npx cap sync ios)'
                    : step.label}
                </p>
                {stepStates[i] === 'failed' && logTail && (
                  <pre className="mt-2 text-[10px] font-mono text-[var(--error)] whitespace-pre-wrap max-h-24 overflow-y-auto bg-[var(--code-bg)] p-2 rounded border border-[var(--error)]/20">
                    {logTail.slice(-800)}
                  </pre>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {logTail && !isComplete && status !== 'failed' && (
        <pre className="text-[10px] font-mono text-nisk-muted whitespace-pre-wrap max-h-40 overflow-y-auto bg-[var(--code-bg)] p-3 rounded-xl border border-[var(--border)]">
          {logTail}
        </pre>
      )}

      {status === 'ready_zip_only' && downloadUrl && (
        <div className="p-5 border-2 border-[var(--copper-primary)]/30 bg-[var(--copper-primary)]/5 rounded-xl space-y-3">
          <h3 className="text-lg font-semibold text-[var(--copper-melt)]">
            Your native project is ready to download
          </h3>
          <p className="text-sm text-nisk-muted">
            Download the ZIP below, unzip it on your Mac, then run one command to finish preparing
            it for Xcode:
          </p>
          <div className="flex items-center justify-between gap-2 bg-[var(--code-bg)] p-3 rounded-lg border border-[var(--border)]">
            <code className="text-sm font-mono text-[var(--copper-melt)]">npx cap sync ios</code>
            <button
              type="button"
              onClick={() => void copyCapCommand()}
              className="text-xs px-3 py-1 rounded-lg border border-[var(--border)] hover:border-[var(--copper-primary)]/40"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-nisk-muted">
            This syncs your web build into the native project. After that, follow the normal Xcode
            steps to archive and submit.
          </p>
          <a href={downloadUrl} className="inline-flex btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold">
            {downloadLabel}
          </a>
        </div>
      )}

      {status === 'ready' && downloadUrl && (
        <div className="p-5 border-2 border-[var(--copper-primary)]/30 bg-[var(--copper-primary)]/5 rounded-xl space-y-3">
          <h3 className="text-lg font-semibold text-[var(--copper-melt)]">Your build is ready</h3>
          <p className="text-sm text-nisk-muted">
            Capacitor sync completed on this Mac. Download the package or open Xcode directly.
          </p>
          <a href={downloadUrl} className="inline-flex btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold">
            {downloadLabel}
          </a>
          {iosWorkspace && (
            <div className="text-xs text-nisk-muted space-y-2 pt-2 border-t border-[var(--border)]">
              <p>From the synced Capacitor folder:</p>
              <pre className="font-mono bg-[var(--code-bg)] p-3 rounded-lg border border-[var(--border)] overflow-x-auto">
                cd {iosWorkspace.replace(/\/ios\/App\/App\.xcworkspace$/, '')}
                {'\n'}npx cap open ios
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
