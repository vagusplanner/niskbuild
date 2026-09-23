/**
 * Builder conversation turns — durable per-project history (not version snapshots).
 */

export type BuilderTurnOutcome = 'built' | 'edited' | 'interrupted' | 'failed';

export type BuilderTurn = {
  id: string;
  project_id: string;
  prompt: string;
  outcome: BuilderTurnOutcome;
  outcome_detail: string;
  model_id: string;
  model_label: string;
  credits_used: number;
  created_at: string;
};

export type BuilderTurnInput = {
  prompt: string;
  outcome: BuilderTurnOutcome;
  outcome_detail?: string;
  model_id?: string;
  model_label?: string;
  credits_used?: number;
  /** Optional client-side temp id before server responds */
  tempId?: string;
};

export function isBuilderTurnOutcome(v: unknown): v is BuilderTurnOutcome {
  return (
    v === 'built' || v === 'edited' || v === 'interrupted' || v === 'failed'
  );
}

export function outcomeLabel(outcome: BuilderTurnOutcome): string {
  switch (outcome) {
    case 'built':
      return 'Built';
    case 'edited':
      return 'Edited';
    case 'interrupted':
      return 'Interrupted';
    case 'failed':
      return 'Failed';
  }
}

export function outcomeToneClass(outcome: BuilderTurnOutcome): string {
  switch (outcome) {
    case 'built':
      return 'text-[var(--success)]';
    case 'edited':
      return 'text-[var(--copper-melt)]';
    case 'interrupted':
      return 'text-amber-400';
    case 'failed':
      return 'text-[var(--error)]';
  }
}

/** POST a turn; returns the saved row or null on failure (never throws). */
export async function createBuilderTurn(
  projectId: string,
  input: BuilderTurnInput
): Promise<BuilderTurn | null> {
  try {
    const res = await fetch(`/api/projects/${projectId}/turns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        prompt: input.prompt,
        outcome: input.outcome,
        outcome_detail: input.outcome_detail ?? '',
        model_id: input.model_id ?? '',
        model_label: input.model_label ?? '',
        credits_used: input.credits_used ?? 0,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.turn as BuilderTurn) ?? null;
  } catch {
    return null;
  }
}

/** GET turns (server may backfill from versions when empty). */
export async function fetchBuilderTurns(
  projectId: string
): Promise<BuilderTurn[]> {
  try {
    const res = await fetch(`/api/projects/${projectId}/turns`, {
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.turns) ? (data.turns as BuilderTurn[]) : [];
  } catch {
    return [];
  }
}

export function makeLocalTurn(
  projectId: string | null,
  input: BuilderTurnInput
): BuilderTurn {
  return {
    id: input.tempId || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    project_id: projectId || 'local',
    prompt: input.prompt,
    outcome: input.outcome,
    outcome_detail: input.outcome_detail ?? '',
    model_id: input.model_id ?? '',
    model_label: input.model_label ?? '',
    credits_used: Number(input.credits_used) || 0,
    created_at: new Date().toISOString(),
  };
}
