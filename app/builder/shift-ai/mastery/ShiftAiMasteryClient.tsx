'use client';

import { useMemo, useState } from 'react';
import { Brain, Loader2, Map, Sparkles, TrendingUp } from 'lucide-react';
import {
  cycleMasteryStatus,
  groupMasteryBySubject,
  subjectMasteryProgress,
  type MasteryStatus,
  type MasterySubjectGroup,
  type MasteryTopic,
} from '@/lib/shift-ai/mastery-shared';
import { SA } from '@/lib/shift-ai/theme';

const STATUS_STYLES: Record<
  MasteryStatus,
  { label: string; card: string; dot: string; badge: string }
> = {
  not_started: {
    label: 'Not started',
    card: 'border-[var(--sa-navy-100)] bg-[var(--sa-secondary)]',
    dot: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-700',
  },
  learning: {
    label: 'Learning',
    card: 'border-amber-200 bg-amber-50',
    dot: 'bg-amber-400',
    badge: 'bg-amber-100 text-amber-800',
  },
  mastered: {
    label: 'Mastered',
    card: 'border-emerald-200 bg-emerald-50',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800',
  },
};

export default function ShiftAiMasteryClient({
  subjectOptions,
  initialSubjectGroups,
}: {
  subjectOptions: string[];
  initialSubjectGroups: MasterySubjectGroup[];
}) {
  const [subjectGroups, setSubjectGroups] = useState(initialSubjectGroups);
  const [selectedSubject, setSelectedSubject] = useState(subjectOptions[0] ?? '');
  const [generating, setGenerating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const selectedGroup = useMemo(
    () => subjectGroups.find((g) => g.subject === selectedSubject) ?? null,
    [subjectGroups, selectedSubject]
  );

  const overallProgress = useMemo(() => {
    const allTopics = subjectGroups.flatMap((g) => g.topics);
    return subjectMasteryProgress(allTopics);
  }, [subjectGroups]);

  const mergeTopics = (newTopics: MasteryTopic[], subject: string) => {
    const other = subjectGroups.filter((g) => g.subject !== subject).flatMap((g) => g.topics);
    const merged = [...other, ...newTopics];
    setSubjectGroups(groupMasteryBySubject(merged, subjectOptions));
  };

  const handleGenerate = async () => {
    if (!selectedSubject) return;

    const replace = Boolean(selectedGroup);
    if (replace) {
      const ok = window.confirm(
        'Regenerate and replace all topics for this subject? Your status progress will reset.'
      );
      if (!ok) return;
    }

    setError('');
    setGenerating(true);

    try {
      const res = await fetch('/api/shift-ai/mastery/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject: selectedSubject,
          replaceExisting: replace,
        }),
      });

      const data = (await res.json()) as { error?: string; topics?: MasteryTopic[] };

      if (!res.ok || !data.topics) {
        throw new Error(data.error || 'Could not generate topic map');
      }

      mergeTopics(data.topics, selectedSubject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate topic map');
    } finally {
      setGenerating(false);
    }
  };

  const handleCycleStatus = async (topic: MasteryTopic) => {
    const nextStatus = cycleMasteryStatus(topic.status);
    setUpdatingId(topic.id);
    setError('');

    try {
      const res = await fetch(`/api/shift-ai/mastery/${topic.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = (await res.json()) as { error?: string; topic?: MasteryTopic };
      if (!res.ok || !data.topic) {
        throw new Error(data.error || 'Could not update topic');
      }

      const allTopics = subjectGroups
        .flatMap((g) => g.topics)
        .map((t) => (t.id === data.topic!.id ? data.topic! : t));
      setSubjectGroups(groupMasteryBySubject(allTopics, subjectOptions));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update topic');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className={`${SA.contentNarrow} space-y-5`}>
      <div>
        <h1 className={`flex items-center gap-2 text-2xl font-bold ${SA.text}`}>
          <Brain className="h-6 w-6 text-[var(--sa-navy-800)]" />
          Mastery Map
        </h1>
        <p className={`mt-1 text-sm ${SA.muted}`}>
          Track your progress across every topic — colour-coded by mastery level
        </p>
      </div>

      {overallProgress.total > 0 ? (
        <div className={SA.cardPadded}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className={`flex items-center gap-2 font-bold ${SA.text}`}>
              <TrendingUp className="h-4 w-4" /> Overall progress
            </h2>
            <span className={`text-2xl font-extrabold ${SA.text}`}>
              {overallProgress.masteredPercent}%
            </span>
          </div>
          <div className="mb-4 h-3 overflow-hidden rounded-full bg-[var(--sa-secondary)]">
            <div
              className="h-full rounded-full bg-[var(--sa-navy-800)] transition-all"
              style={{ width: `${overallProgress.masteredPercent}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-lg font-bold text-emerald-700">{overallProgress.masteredCount}</p>
              <p className={SA.muted}>Mastered</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <p className="text-lg font-bold text-amber-700">{overallProgress.learningCount}</p>
              <p className={SA.muted}>Learning</p>
            </div>
            <div className="rounded-xl bg-slate-100 p-3">
              <p className="text-lg font-bold text-slate-700">{overallProgress.notStartedCount}</p>
              <p className={SA.muted}>Not started</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 text-xs">
        {(
          [
            ['not_started', 'Not started'],
            ['learning', 'Learning'],
            ['mastered', 'Mastered'],
          ] as const
        ).map(([status, label]) => (
          <div key={status} className={`flex items-center gap-1.5 ${SA.muted}`}>
            <div className={`h-3 w-3 rounded-full ${STATUS_STYLES[status].dot}`} />
            {label}
          </div>
        ))}
        <span className={SA.muted}>· Tap a topic card to cycle status</span>
      </div>

      {subjectOptions.length === 0 ? (
        <div className={`${SA.cardPadded} py-12 text-center`}>
          <p className={`text-sm ${SA.muted}`}>
            Add favourite subjects during onboarding to build your mastery map.
          </p>
        </div>
      ) : (
        <div className={`${SA.cardPadded} space-y-4`}>
          <div>
            <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wide ${SA.muted}`}>
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className={SA.select}
            >
              {subjectOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {selectedGroup ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className={`text-sm font-semibold ${SA.text}`}>
                  {selectedGroup.masteredCount}/{selectedGroup.topics.length} mastered
                </p>
                <p className={`text-sm font-bold text-[var(--sa-navy-800)]`}>
                  {selectedGroup.masteredPercent}%
                </p>
              </div>
              <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-[var(--sa-secondary)]">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${selectedGroup.masteredPercent}%` }}
                />
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generating || !selectedSubject}
            className={`${SA.btnPrimary} w-full gap-2 py-2.5`}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating topic map…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {selectedGroup ? 'Regenerate topic map' : 'Generate topic map'}
              </>
            )}
          </button>

          {!selectedGroup ? (
            <div className={`rounded-xl bg-[var(--sa-navy-50)] px-4 py-6 text-center ${SA.muted}`}>
              <Map className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">No topics yet for {selectedSubject || 'this subject'}.</p>
              <p className="mt-1 text-xs">Generate a map of 12–15 curriculum topics to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {selectedGroup.topics.map((topic) => {
                const style = STATUS_STYLES[topic.status];
                const busy = updatingId === topic.id;

                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => void handleCycleStatus(topic)}
                    disabled={busy}
                    className={`rounded-xl border p-3 text-left transition-all hover:shadow-sm ${style.card} ${
                      busy ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold leading-snug ${SA.text}`}>{topic.topic}</p>
                      <span
                        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.badge}`}
                      >
                        {style.label}
                      </span>
                    </div>
                    <p className={`text-[10px] ${SA.muted}`}>Tap to update status</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {subjectGroups.filter((g) => g.subject !== selectedSubject).length > 0 ? (
        <div className="space-y-3">
          <h2 className={`text-sm font-bold ${SA.text}`}>Other subjects</h2>
          {subjectGroups
            .filter((g) => g.subject !== selectedSubject)
            .map((group) => (
              <button
                key={group.subject}
                type="button"
                onClick={() => setSelectedSubject(group.subject)}
                className={`${SA.cardPadded} w-full text-left transition-all hover:shadow-sm`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className={`font-bold ${SA.text}`}>{group.subject}</p>
                  <span className={`text-sm font-bold text-[var(--sa-navy-800)]`}>
                    {group.masteredPercent}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--sa-secondary)]">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${group.masteredPercent}%` }}
                  />
                </div>
                <p className={`mt-2 text-xs ${SA.muted}`}>
                  {group.topics.length} topics · {group.masteredCount} mastered
                </p>
              </button>
            ))}
        </div>
      ) : null}

      {error ? <p className={SA.error}>{error}</p> : null}
    </div>
  );
}
