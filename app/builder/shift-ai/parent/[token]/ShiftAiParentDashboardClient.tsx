'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CalendarDays,
  Gamepad2,
  Layers,
  Target,
  Zap,
} from 'lucide-react';
import type { ObserverSnapshot } from '@/lib/shift-ai/observer-shared';

type Tab = 'overview' | 'mastery' | 'activity';

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-white p-4 text-center">
      <p className="mb-1 text-2xl">{icon}</p>
      <p className="text-2xl font-bold text-[var(--sa-navy-900)]">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

export default function ShiftAiParentDashboardClient({ snapshot }: { snapshot: ObserverSnapshot }) {
  const t = useTranslations('parentView');
  const [tab, setTab] = useState<Tab>('overview');
  const { student, planner, mastery, activity } = snapshot;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: t('tabOverview') },
    { id: 'mastery', label: t('tabMastery') },
    { id: 'activity', label: t('tabActivity') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050d1a] to-[#0a1628] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                {t('kicker')}
              </p>
              <h1 className="text-xl font-bold text-[var(--sa-navy-900)]">
                {t('progressTitle', { name: student.fullName })}
              </h1>
              <p className="text-sm text-neutral-500">
                {student.yearGroup} · {student.keyStage}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-1 rounded-xl bg-white/10 p-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium capitalize transition-all ${
                tab === item.id ? 'bg-white text-[var(--sa-navy-800)] shadow-sm' : 'text-white/60 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'overview' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label={t('tasksDone')} value={planner.completed} icon="✅" />
              <StatCard label={t('overdue')} value={planner.overdue} icon="⚠️" />
              <StatCard label={t('upcoming')} value={planner.upcoming} icon="📅" />
              <StatCard label={t('masteryPct')} value={`${mastery[0]?.masteredPercent ?? 0}%`} icon="🎯" />
            </div>

            <div className="rounded-2xl bg-white p-5">
              <h2 className="mb-4 flex items-center gap-2 font-bold text-[var(--sa-navy-800)]">
                <Gamepad2 className="h-4 w-4" />
                {t('recentActivity')}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-neutral-50 p-4">
                  <p className="text-xs text-neutral-500">{t('quizArcade')}</p>
                  <p className="text-lg font-bold text-[var(--sa-navy-900)]">
                    {t('gamesCount', { count: activity.arcadeGamesPlayed })}
                  </p>
                  <p className="text-sm text-neutral-600">
                    {t('bestScore', { score: activity.arcadeBestScore.toLocaleString() })}
                    {activity.arcadeRecentSubject ? ` · ${activity.arcadeRecentSubject}` : ''}
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50 p-4">
                  <p className="text-xs text-neutral-500">{t('flashcards')}</p>
                  <p className="text-lg font-bold text-[var(--sa-navy-900)]">
                    {t('decksCount', { count: activity.flashcardDecks })}
                  </p>
                  <p className="text-sm text-neutral-600">
                    {t('reviewsThisWeek', { count: activity.flashcardReviewsLast7Days })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === 'mastery' ? (
          <div className="rounded-2xl bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-[var(--sa-navy-800)]">
              <Target className="h-4 w-4" />
              {t('masteryBySubject')}
            </h2>
            {mastery.length === 0 ? (
              <p className="text-sm text-neutral-500">{t('noMastery')}</p>
            ) : (
              <div className="space-y-3">
                {mastery.map((group) => (
                  <div key={group.subject}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-[var(--sa-navy-900)]">{group.subject}</span>
                      <span className="text-neutral-500">
                        {t('masteredLine', {
                          mastered: group.masteredCount,
                          total: group.topics.length,
                          percent: group.masteredPercent,
                        })}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-[var(--sa-navy-700)]"
                        style={{ width: `${group.masteredPercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {tab === 'activity' ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-5">
              <h2 className="mb-4 flex items-center gap-2 font-bold text-[var(--sa-navy-800)]">
                <CalendarDays className="h-4 w-4" />
                {t('planner')}
              </h2>
              {planner.recentOverdue.length > 0 ? (
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-semibold uppercase text-red-600">{t('overdue')}</p>
                  {planner.recentOverdue.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                      <span className="flex-1 text-sm font-medium">{item.title}</span>
                      <span className="text-xs text-red-700">
                        {new Date(item.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              {planner.recentUpcoming.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-neutral-500">{t('upcoming')}</p>
                  {planner.recentUpcoming.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2">
                      <span className="flex-1 text-sm font-medium">{item.title}</span>
                      <span className="text-xs text-neutral-500">
                        {new Date(item.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">{t('noUpcoming')}</p>
              )}
            </div>

            <div className="rounded-2xl bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 font-bold text-[var(--sa-navy-800)]">
                <Layers className="h-4 w-4" />
                {t('flashArcadeSummary')}
              </h2>
              <ul className="space-y-1 text-sm text-neutral-700">
                <li>{t('decksLine', { count: activity.flashcardDecks })}</li>
                <li>{t('reviewsLine', { count: activity.flashcardReviewsLast7Days })}</li>
                <li>{t('sessionsLine', { count: activity.arcadeGamesPlayed })}</li>
                <li>{t('bestArcadeLine', { score: activity.arcadeBestScore.toLocaleString() })}</li>
              </ul>
            </div>
          </div>
        ) : null}

        <p className="pb-4 text-center text-xs text-white/20">{t('footer')}</p>
      </div>
    </div>
  );
}
