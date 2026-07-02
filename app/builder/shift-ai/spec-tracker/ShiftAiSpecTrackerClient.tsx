'use client';

import { useState } from 'react';
import { Loader2, RefreshCw, Target } from 'lucide-react';
import {
  EXAM_BOARDS,
} from '@/lib/shift-ai/essay-curriculum';
import type { SpecPoint } from '@/lib/shift-ai/spec-tracker-shared';
import {
  SPEC_STATUS_LABELS,
  SPEC_STATUS_STYLES,
  cycleSpecStatus,
  isSpecStatus,
} from '@/lib/shift-ai/spec-tracker-shared';
import type { ShiftCurriculum } from '@/lib/shift-ai/constants';
import { SA } from '@/lib/shift-ai/theme';

export default function ShiftAiSpecTrackerClient({
  subjectOptions,
  curriculum,
  initialPoints,
}: {
  subjectOptions: string[];
  curriculum: ShiftCurriculum;
  initialPoints: SpecPoint[];
}) {
  const boards = EXAM_BOARDS[curriculum] ?? EXAM_BOARDS.uk;
  const [subject, setSubject] = useState(subjectOptions[0] ?? '');
  const [examBoard, setExamBoard] = useState(boards[0] ?? '');
  const [points, setPoints] = useState<SpecPoint[]>(initialPoints);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');

  const visiblePoints = points.filter((p) => !subject || p.subject === subject);
  const coveredCount = visiblePoints.filter((p) => p.status === 'covered').length;
  const reviewCount = visiblePoints.filter((p) => p.status === 'needs_review').length;
  const coverage =
    visiblePoints.length > 0 ? Math.round((coveredCount / visiblePoints.length) * 100) : 0;

  const generate = async () => {
    if (!subject) {
      setError('Choose a subject');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/shift-ai/spec-tracker/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subject, examBoard }),
      });

      const data = (await res.json()) as { points?: SpecPoint[]; error?: string };
      if (!res.ok || !data.points) {
        throw new Error(data.error || 'Could not generate spec points');
      }

      setPoints((prev) => [
        ...prev.filter((p) => p.subject !== subject),
        ...data.points!,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate spec');
    } finally {
      setLoading(false);
    }
  };

  const cycleStatus = async (point: SpecPoint) => {
    const next = cycleSpecStatus(isSpecStatus(point.status) ? point.status : 'not_covered');
    setUpdatingId(point.id);

    try {
      const res = await fetch(`/api/shift-ai/spec-tracker/${point.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: next }),
      });

      const data = (await res.json()) as { point?: SpecPoint; error?: string };
      if (!res.ok || !data.point) {
        throw new Error(data.error || 'Could not update status');
      }

      setPoints((prev) => prev.map((p) => (p.id === point.id ? data.point! : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status');
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <div className={`${SA.contentNarrow} space-y-5`}>
      <div>
        <h1 className={`${SA.headingMd} flex items-center gap-2`}>
          <span aria-hidden>🗺️</span> Spec Tracker
        </h1>
        <p className={`mt-1 text-sm ${SA.muted}`}>
          Track curriculum specification points — mark each as covered or needs review.
        </p>
      </div>

      <div className={`${SA.cardPadded} grid gap-4 sm:grid-cols-3`}>
        <div className="space-y-2">
          <label htmlFor="st-subject" className={`block text-sm font-medium ${SA.text}`}>
            Subject
          </label>
          <select
            id="st-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={SA.select}
          >
            {subjectOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="st-board" className={`block text-sm font-medium ${SA.text}`}>
            Exam board
          </label>
          <select
            id="st-board"
            value={examBoard}
            onChange={(e) => setExamBoard(e.target.value)}
            className={SA.select}
          >
            {boards.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading || !subject}
            className={`${SA.btnPrimary} h-10 w-full`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : visiblePoints.length > 0 ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Regenerate spec
              </>
            ) : (
              <>
                <Target className="h-4 w-4" />
                Generate spec
              </>
            )}
          </button>
        </div>
      </div>

      {error ? <div className={SA.error}>{error}</div> : null}

      {visiblePoints.length > 0 ? (
        <>
          <div className={`${SA.cardPadded} space-y-3`}>
            <div className="flex items-center justify-between gap-2">
              <p className={`text-sm font-bold ${SA.text}`}>
                Coverage — {subject} ({examBoard})
              </p>
              <span className="text-lg font-extrabold text-[var(--sa-navy-700)]">{coverage}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--sa-navy-100)]">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${coverage}%` }}
              />
            </div>
            <p className={`text-xs ${SA.muted}`}>
              Covered: {coveredCount} · Needs review: {reviewCount} · Not covered:{' '}
              {visiblePoints.length - coveredCount - reviewCount} · Total: {visiblePoints.length}
            </p>
          </div>

          <div className="space-y-2">
            {visiblePoints.map((point) => (
              <button
                key={point.id}
                type="button"
                onClick={() => void cycleStatus(point)}
                disabled={updatingId === point.id}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-shadow hover:shadow-sm ${SPEC_STATUS_STYLES[point.status]}`}
              >
                <span className={`mt-0.5 text-xs font-bold uppercase tracking-wide ${SA.muted}`}>
                  {point.spec_code}
                </span>
                <span className={`flex-1 text-sm ${SA.text}`}>{point.description}</span>
                <span className="text-xs font-medium opacity-80">
                  {SPEC_STATUS_LABELS[point.status]}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className={`${SA.cardPadded} text-center`}>
          <p className={`text-sm ${SA.muted}`}>
            Choose a subject and generate your exam specification points to start tracking.
          </p>
        </div>
      )}
    </div>
  );
}
