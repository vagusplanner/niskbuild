'use client';

import { useMemo, useState } from 'react';
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
} from '@/lib/shift-ai/analytics-shared';
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
}: {
  subjectOptions: string[];
  initialSnapshot: AnalyticsSnapshot;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>('30');
  const [activityType, setActivityType] = useState<AnalyticsActivityType | 'all'>('all');
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [loading, setLoading] = useState(false);

  const masteryChartData = useMemo(
    () => [
      { name: 'Mastered', value: snapshot.masteryBreakdown.mastered, fill: MASTERY_COLORS.mastered },
      { name: 'Learning', value: snapshot.masteryBreakdown.learning, fill: MASTERY_COLORS.learning },
      {
        name: 'Not started',
        value: snapshot.masteryBreakdown.not_started,
        fill: MASTERY_COLORS.not_started,
      },
    ],
    [snapshot.masteryBreakdown]
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
            <span aria-hidden>📊</span> Analytics
          </h1>
          <p className={`mt-1 text-sm ${SA.muted}`}>
            Real study activity from your planner, quizzes, flashcards, and mastery updates.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen((v) => !v)}
          className={`${SA.btnSecondary} text-sm`}
        >
          Filters
        </button>
      </div>

      {filterOpen ? (
        <div className={`${SA.cardPadded} grid gap-4 sm:grid-cols-3`}>
          <div className="space-y-2">
            <label className={`block text-xs font-semibold uppercase tracking-wide ${SA.muted}`}>
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={SA.select}
            >
              <option value="">All subjects</option>
              {subjectOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className={`block text-xs font-semibold uppercase tracking-wide ${SA.muted}`}>
              Date range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as AnalyticsDateRange)}
              className={SA.select}
            >
              {DATE_RANGE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className={`block text-xs font-semibold uppercase tracking-wide ${SA.muted}`}>
              Activity type
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
                  {o.label}
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
            {loading ? 'Updating…' : 'Apply filters'}
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Planner done', value: snapshot.totals.plannerCompleted },
          { label: 'Quiz sessions', value: snapshot.totals.arcadeSessions },
          { label: 'Flashcard reviews', value: snapshot.totals.flashcardReviews },
          { label: 'Chat messages', value: snapshot.totals.chatMessages },
        ].map((stat) => (
          <div key={stat.label} className={`${SA.cardPadded} text-center`}>
            <p className="text-2xl font-extrabold text-[var(--sa-navy-700)]">{stat.value}</p>
            <p className={`text-xs ${SA.muted}`}>{stat.label}</p>
          </div>
        ))}
      </div>

      {subjectBarData.length > 0 ? (
        <div className={`${SA.cardPadded}`}>
          <p className={`mb-4 text-sm font-bold ${SA.text}`}>Activity by subject</p>
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
          <p className={`mb-4 text-sm font-bold ${SA.text}`}>Mastery status breakdown</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={masteryChartData} layout="vertical" barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`${SA.cardPadded}`}>
          <p className={`mb-4 text-sm font-bold ${SA.text}`}>Task completion over time</p>
          {snapshot.taskCompletionOverTime.length > 0 ? (
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
                  name="Completed"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Created"
                  stroke="#1e3a5f"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className={`text-sm ${SA.muted}`}>No planner activity in this period.</p>
          )}
        </div>
      </div>
    </div>
  );
}
