'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, Sparkles, Target } from 'lucide-react';
import type {
  GradePredictionResult,
  SavedGradePrediction,
} from '@/lib/shift-ai/grade-predictor-shared';
import { SA } from '@/lib/shift-ai/theme';

function SignalBar({ label, value, suffix = '%' }: { label: string; value: number | null; suffix?: string }) {
  const display = value === null ? '—' : `${value}${suffix}`;
  const width = value === null ? 0 : Math.min(100, value);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={SA.muted}>{label}</span>
        <span className={`font-semibold ${SA.text}`}>{display}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--sa-navy-100)]">
        <div
          className="h-full rounded-full bg-[var(--sa-navy-600)] transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function ShiftAiGradePredictorClient({
  subjectOptions,
  recentPredictions,
}: {
  subjectOptions: string[];
  recentPredictions: SavedGradePrediction[];
}) {
  const t = useTranslations('gradePredictor');
  const locale = useLocale();
  const [subject, setSubject] = useState(subjectOptions[0] ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prediction, setPrediction] = useState<GradePredictionResult | null>(null);
  const [history, setHistory] = useState(recentPredictions);

  const generate = async () => {
    if (!subject) {
      setError(t('errors.chooseSubject'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/shift-ai/grade-predictor/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subject }),
      });

      const data = (await res.json()) as { prediction?: GradePredictionResult; error?: string };
      if (!res.ok || !data.prediction) {
        throw new Error(data.error || t('errors.generateFailed'));
      }

      setPrediction(data.prediction);
      setHistory((prev) => [
        {
          id: crypto.randomUUID(),
          subject,
          predicted_grade: data.prediction!.predicted_grade,
          confidence: data.prediction!.confidence,
          factors: data.prediction!,
          generated_at: new Date().toISOString(),
        },
        ...prev.filter((p) => p.subject !== subject),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const signals = prediction?.signals;

  return (
    <div className={`${SA.contentNarrow} space-y-5`}>
      <div>
        <h1 className={`${SA.headingMd} flex items-center gap-2`}>
          <span aria-hidden>🎯</span> {t('title')}
        </h1>
        <p className={`mt-1 text-sm ${SA.muted}`}>{t('subtitle')}</p>
      </div>

      <div className={`${SA.tip} text-sm`}>{t('honesty')}</div>

      <div className={`${SA.cardPadded} space-y-4`}>
        <div className="space-y-2">
          <label htmlFor="gp-subject" className={`block text-sm font-medium ${SA.text}`}>
            {t('subject')}
          </label>
          <select
            id="gp-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={SA.select}
            disabled={loading}
          >
            {subjectOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={loading || !subject}
          className={`${SA.btnPrimary} h-11 w-full`}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('analysing')}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {t('generatePrediction')}
            </>
          )}
        </button>
      </div>

      {error ? <div className={SA.error}>{error}</div> : null}

      {prediction && signals ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[var(--sa-navy-800)] p-6 text-center text-white">
            <p className="text-xs uppercase tracking-wide text-white/50">{t('predictedGrade')}</p>
            <p className="mt-1 text-5xl font-extrabold">{prediction.predicted_grade}</p>
            <p className="mt-2 text-sm text-white/70">
              {t('confidence', { percent: Math.round(prediction.confidence * 100) })}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/85">
              {t('basedOnMastery', { percent: signals.masteryPercent })}
              {signals.avgQuizScorePercent !== null
                ? t('avgQuizScore', { percent: signals.avgQuizScorePercent })
                : ''}
              {signals.flashcardRetentionPercent !== null
                ? t('flashcardRetention', { percent: signals.flashcardRetentionPercent })
                : ''}
              {t('plannerCompletion', { percent: signals.plannerCompletionPercent })}
            </p>
          </div>

          <div className={`${SA.cardPadded} space-y-3`}>
            <p className={`text-sm font-bold ${SA.text}`}>{t('signalsUsed')}</p>
            <SignalBar
              label={t('masteryTopics', {
                mastered: signals.masteredCount,
                total: signals.masteryTotal,
              })}
              value={signals.masteryPercent}
            />
            <SignalBar
              label={t('quizArcadeAvg', { count: signals.quizSessions })}
              value={signals.avgQuizScorePercent}
            />
            <SignalBar
              label={t('flashcardRetentionBar', {
                retained: signals.flashcardRetained,
                total: signals.flashcardTotal,
              })}
              value={signals.flashcardRetentionPercent}
            />
            <SignalBar
              label={t('plannerCompletionBar', {
                completed: signals.plannerCompleted,
                total: signals.plannerTotal,
              })}
              value={signals.plannerCompletionPercent}
            />
          </div>

          {prediction.priority_topics.length > 0 ? (
            <div className={`${SA.cardPadded} space-y-2`}>
              <p className={`flex items-center gap-2 text-sm font-bold ${SA.text}`}>
                <Target className="h-4 w-4 text-amber-600" />
                {t('priorityTopics')}
              </p>
              <ul className={`list-inside list-disc text-sm ${SA.text}`}>
                {prediction.priority_topics.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className={SA.tip}>
            <p className={`text-sm font-semibold ${SA.text}`}>{t('improvementPlan')}</p>
            <p className={`mt-1 text-sm ${SA.muted}`}>{prediction.improvement_plan}</p>
          </div>
        </div>
      ) : null}

      {history.length > 0 ? (
        <div className={`${SA.cardPadded} space-y-3`}>
          <p className={`text-sm font-bold ${SA.text}`}>{t('recentPredictions')}</p>
          {history.slice(0, 5).map((row) => (
            <div
              key={`${row.subject}-${row.generated_at}`}
              className="flex items-center justify-between gap-2 border-b border-[var(--sa-navy-100)] pb-2 last:border-0 last:pb-0"
            >
              <div>
                <p className={`text-sm font-medium ${SA.text}`}>{row.subject}</p>
                <p className={`text-xs ${SA.muted}`}>
                  {new Date(row.generated_at).toLocaleDateString(locale === 'ar' ? 'ar' : 'en', {
                    dateStyle: 'medium',
                  })}
                </p>
              </div>
              <span className="text-lg font-extrabold text-[var(--sa-navy-700)]">
                {row.predicted_grade}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
