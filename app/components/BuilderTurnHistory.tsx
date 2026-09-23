"use client";

import { useEffect, useRef, useState } from 'react';
import {
  outcomeLabel,
  outcomeToneClass,
  type BuilderTurn,
} from '@/lib/builder-turns';

type BuilderTurnHistoryProps = {
  turns: BuilderTurn[];
  onReusePrompt: (prompt: string) => void;
};

function TurnCard({
  turn,
  onReusePrompt,
}: {
  turn: BuilderTurn;
  onReusePrompt: (prompt: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const long = turn.prompt.length > 140;
  const shown =
    expanded || !long ? turn.prompt : `${turn.prompt.slice(0, 140).trimEnd()}…`;
  const when = new Date(turn.created_at);
  const timeLabel = Number.isNaN(when.getTime())
    ? ''
    : when.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  return (
    <article className="rounded-xl border border-[var(--border)]/70 bg-[var(--code-bg)]/70 px-3 py-2.5 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onReusePrompt(turn.prompt)}
          className="text-left text-[12px] leading-snug text-[var(--foreground)] hover:text-[var(--copper-melt)] transition-colors whitespace-pre-wrap break-words min-w-0 flex-1"
          title="Click to refill the prompt box"
        >
          {shown}
        </button>
        <span
          className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${outcomeToneClass(turn.outcome)}`}
        >
          {outcomeLabel(turn.outcome)}
        </span>
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[10px] text-nisk-muted hover:text-[var(--copper-melt)]"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
      {turn.outcome_detail && (
        <p className="text-[10px] text-nisk-muted leading-snug line-clamp-2">
          {turn.outcome_detail}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-nisk-muted">
        {turn.model_label && <span>{turn.model_label}</span>}
        {(turn.credits_used > 0 || turn.outcome === 'built' || turn.outcome === 'edited') && (
          <span className="tabular-nums">
            {turn.credits_used > 0
              ? `${turn.credits_used} credit${turn.credits_used === 1 ? '' : 's'}`
              : '0 credits'}
          </span>
        )}
        {timeLabel && <span className="ml-auto tabular-nums opacity-80">{timeLabel}</span>}
      </div>
    </article>
  );
}

/** Scrollable session history — lives in the chat column above suggestions/dock. */
export default function BuilderTurnHistory({
  turns,
  onReusePrompt,
}: BuilderTurnHistoryProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (turns.length === 0) return;
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [turns.length, turns[turns.length - 1]?.id]);

  if (turns.length === 0) return null;

  return (
    <div className="mx-3 mt-2 mb-1 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-nisk-muted px-0.5">
        History
      </p>
      <div className="space-y-2">
        {turns.map((turn) => (
          <TurnCard key={turn.id} turn={turn} onReusePrompt={onReusePrompt} />
        ))}
      </div>
      <div ref={endRef} />
    </div>
  );
}
