'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  AnalyticsActivityType,
  AnalyticsDateRange,
  AnalyticsSnapshot,
  HeatmapDay,
} from '@/lib/shift-ai/analytics-shared';
import ShiftAiMasteryHeatmapClient from '@/app/builder/shift-ai/mastery-heatmap/ShiftAiMasteryHeatmapClient';
import {
  ACTIVITY_TYPE_OPTIONS,
  DATE_RANGE_OPTIONS,
} from '@/lib/shift-ai/analytics-shared';
import { SA } from '@/lib/shift-ai/theme';

const MASTERY_COLORS = {
  mastered: '#059669',
  learning: '#d97706',
  not_started: '#dc2626',
};

export default function ShiftAiAnalyticsClient({
  subjectOptions,
  initialSnapshot,
  heatmapDays,
  heatmapTotal,
  heatmapActiveDays,
}: {
  subjectOptions: string[];
  initialSnapshot: AnalyticsSnapshot;
  heatmapDays: HeatmapDay[];
  heatmapTotal: number;
  heatmapActiveDays: number;
}) {
  const t = useTranslations('analytics');
  const tMastery = useTranslations('mastery.status');
  const [filterOpen, setFilterOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>('30');
  const [activityType, setActivityType] = useState<AnalyticsActivityType | 'all'>('all');
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [loading, setLoading] = useState(false);

  const masteryChartData = useMemo(
    () => [
      {
        name: tMastery('mastered'),
        value: snapshot.masteryBreakdown.mastered,
        fill: MASTERY_COLORS.mastered,
      },
      {
        name: tMastery('learning'),
        value: snapshot.masteryBreakdown.learning,
        fill: MASTERY_COLORS.learning,
      },
      {
        name: tMastery('not_started'),
        value: snapshot.masteryBreakdown.not_started,
        fill: MASTERY_COLORS.not_started,
      },
    ],
    [snapshot.masteryBreakdown, tMastery]
  );

  const subjectBarData = snapshot.subjectActivity.map((row) => ({
    name: row.subject.length > 12 ? `${row.subject.slice(0, 12)}…` : row.subject,
    activity: row.total,
  }));

  const applyFilters = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        dateRange,
        activityType,
      });
      if (subject) params.set('subject', subject);

      const res = await fetch(`/api/shift-ai/analytics?${params.toString()}`, {
        credentials: 'include',
      });
      const data = (await res.json()) as { snapshot?: AnalyticsSnapshot; error?: string };
      if (res.ok && data.snapshot) {
        setSnapshot(data.snapshot);
      }
    } finally {
      setLoading(false);
      setFilterOpen(false);
    }
  };

  return (
    <div className={`${SA.content} space-y-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={`${SA.headingMd} flex items-center gap-2`}>
            <span aria-hidden>📊</span> {t('title')}
          </h1>
          <p className={`mt-1 text-sm ${SA.muted}`}>{t('subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen((v) => !v)}
          className={`${SA.btnSecondary} text-sm`}
        >
          {t('filters')}
        </button>
      </div>

      {filterOpen ? (
        <div className={`${SA.cardPadded} grid gap-4 sm:grid-cols-3`}>
          <div className="space-y-2">
            <label className={`block text-xs font-semibold uppercase tracking-wide ${SA.muted}`}>
              {t('subject')}
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={SA.select}
            >
              <option value="">{t('allSubjects')}</option>
              {subjectOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className={`block text-xs font-semibold uppercase tracking-wide ${SA.muted}`}>
              {t('dateRange')}
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as AnalyticsDateRange)}
              className={SA.select}
            >
              {DATE_RANGE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {t(`dateRanges.${o.id}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className={`block text-xs font-semibold uppercase tracking-wide ${SA.muted}`}>
              {t('activityType')}
            </label>
            <select
              value={activityType}
              onChange={(e) =>
                setActivityType(e.target.value as AnalyticsActivityType | 'all')
              }
              className={SA.select}
            >
              {ACTIVITY_TYPE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {t(`activityTypes.${o.id}`)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void applyFilters()}
            disabled={loading}
            className={`${SA.btnPrimary} sm:col-span-3`}
          >
            {loading ? t('updating') : t('applyFilters')}
          </button>
        </div>
      ) : null}

      <ShiftAiMasteryHeatmapClient
        heatmapDays={heatmapDays}
        totalActivity={heatmapTotal}
        activeDays={heatmapActiveDays}
        embedded
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t('statPlanner'), value: snapshot.totals.plannerCompleted },
          { label: t('statArcade'), value: snapshot.totals.arcadeSessions },
          { label: t('statFlashcards'), value: snapshot.totals.flashcardReviews },
          { label: t('statChat'), value: snapshot.totals.chatMessages },
        ].map((stat) => (
          <div key={stat.label} className={`${SA.cardPadded} text-center`}>
            <p className="text-2xl font-extrabold text-[var(--sa-navy-700)]">{stat.value}</p>
            <p className={`text-xs ${SA.muted}`}>{stat.label}</p>
          </div>
        ))}
      </div>

      {subjectBarData.length > 0 ? (
        <div className={`${SA.cardPadded}`}>
          <p className={`mb-4 text-sm font-bold ${SA.text}`}>{t('activityBySubject')}</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={subjectBarData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="activity" fill="#1e3a5f" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className={`${SA.cardPadded}`}>
          <p className={`mb-4 text-sm font-bold ${SA.text}`}>{t('masteryBreakdown')}</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={masteryChartData} layout="vertical" barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`${SA.cardPadded}`}>
          <p className={`mb-4 text-sm font-bold ${SA.text}`}>{t('taskCompletion')}</p>
          {snapshot.taskCompletionOverTime.length > 0 ? (
            <div dir="ltr">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={snapshot.taskCompletionOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name={t('legendCompleted')}
                  stroke="#059669"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name={t('legendCreated')}
                  stroke="#1e3a5f"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            </div>
          ) : (
            <p className={`text-sm ${SA.muted}`}>{t('noPlannerActivity')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
