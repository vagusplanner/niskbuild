"use client";

import { useEffect, useRef } from 'react';

export type GenerationActivityStep = {
  id: string;
  label: string;
  source: string;
};

type GenerationActivityPanelProps = {
  activityLog?: string[];
  streamingSteps?: GenerationActivityStep[];
  streamingNarration?: string;
  streamingLine?: string;
  streamingCode?: string;
  showCodeStream?: boolean;
  isGenerating: boolean;
  planMode?: boolean;
  /** When true, omit outer card chrome (used inside PromptBar's dock card). */
  embedded?: boolean;
};

/** Live generation progress — lives in the chat scroll area above the prompt dock. */
export default function GenerationActivityPanel({
  activityLog = [],
  streamingSteps = [],
  streamingNarration,
  streamingLine,
  streamingCode,
  showCodeStream = false,
  isGenerating,
  planMode = false,
  embedded = false,
}: GenerationActivityPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasContent =
    activityLog.length > 0 ||
    streamingSteps.length > 0 ||
    !!streamingNarration ||
    !!streamingLine ||
    (showCodeStream && !!streamingCode) ||
    isGenerating;

  useEffect(() => {
    if (!hasContent) return;
    bottomRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [
    hasContent,
    activityLog.length,
    streamingSteps.length,
    streamingNarration,
    streamingLine,
    streamingCode,
    isGenerating,
  ]);

  if (!hasContent) return null;

  return (
    <div
      className={
        embedded
          ? 'max-h-28 shrink-0 overflow-y-auto border-b border-[var(--border)]/60 px-3 py-2 space-y-2'
          : 'mx-3 mt-2 mb-2 rounded-xl border border-[var(--border)]/70 bg-[var(--code-bg)]/80 px-3 py-2 space-y-2'
      }
    >
      {activityLog.map((line, i) => (
        <p
          key={`${i}-${line.slice(0, 24)}`}
          className={`text-[11px] text-[var(--code-comment)] leading-relaxed font-mono whitespace-pre-wrap break-words ${
            line.includes('❌') ? 'max-h-24 overflow-y-auto' : ''
          }`}
        >
          {line}
        </p>
      ))}
      {streamingSteps.length > 0 && (
        <ol className="space-y-1.5" aria-live="polite" aria-label="Build progress">
          {streamingSteps.map((step, i) => {
            const isActive = isGenerating && i === streamingSteps.length - 1;
            const isDone = !isGenerating || i < streamingSteps.length - 1;
            return (
              <li
                key={`${step.source}-${step.id}`}
                className={`flex items-start gap-2 text-[13px] leading-snug ${
                  isActive
                    ? 'text-[var(--copper-melt)]'
                    : isDone
                      ? 'text-[var(--foreground)]/80'
                      : 'text-[var(--code-comment)]'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    isActive
                      ? 'border-[var(--copper-melt)] text-[var(--copper-melt)]'
                      : isDone
                        ? 'border-[var(--success)] text-[var(--success)]'
                        : 'border-[var(--border)] text-[var(--code-comment)]'
                  }`}
                  aria-hidden
                >
                  {isDone && !isActive ? '✓' : i + 1}
                </span>
                <span className="min-w-0">
                  {step.label}
                  {isActive && (
                    <span
                      className="inline-block w-2 h-[1em] bg-[var(--copper-melt)] animate-pulse align-middle ml-1"
                      aria-hidden
                    />
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {streamingSteps.length === 0 && streamingNarration && (
        <div className="text-[13px] text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
          {streamingNarration}
          {isGenerating && (
            <span
              className="inline-block w-2 h-[1em] bg-[var(--copper-melt)] animate-pulse align-middle ml-0.5"
              aria-hidden
            />
          )}
        </div>
      )}
      {showCodeStream && streamingCode && (
        <pre className="font-mono text-xs text-[var(--code-tag)] whitespace-pre-wrap break-all leading-relaxed max-h-24 overflow-y-auto">
          {streamingCode.slice(-1200)}
          <span
            className="inline-block w-2 h-[1.1em] bg-[var(--copper-melt)] animate-pulse align-middle ml-0.5"
            aria-hidden
          />
        </pre>
      )}
      {streamingSteps.length === 0 &&
        !streamingNarration &&
        !streamingCode &&
        (streamingLine || isGenerating) && (
          <p className="text-[13px] text-[var(--copper-melt)] leading-relaxed flex items-start gap-1">
            <span>{streamingLine || (planMode ? 'Planning…' : 'Building…')}</span>
            <span
              className="inline-block w-2.5 h-[1.1em] bg-[var(--copper-melt)] animate-pulse shrink-0"
              aria-hidden
            />
          </p>
        )}
      <div ref={bottomRef} />
    </div>
  );
}
